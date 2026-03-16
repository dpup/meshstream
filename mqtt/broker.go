package mqtt

import (
	"sync"
	"time"

	meshtreampb "meshstream/generated/meshstream"
	pb "meshstream/generated/meshtastic"

	"github.com/dpup/prefab/logging"
)

// Time to wait before giving up on sending cached packets to a new subscriber.
var cacheGracePeriod = 1500 * time.Millisecond

// minEvictAge is the minimum age a packet must reach before it is eligible for
// priority-based eviction. Recent traffic is never evicted; only historical
// data competes under cache pressure.
var minEvictAge = time.Hour

// typePriority defines the eviction priority for each packet type.
// Higher values indicate greater importance: under cache pressure the oldest
// eligible packet of the lowest-priority type is evicted first, so rare
// high-value types (neighbour-info, chat) outlive frequent low-value types
// (node-info, telemetry) in the historical window.
//
// Packet types not listed use defaultTypePriority.
var typePriority = map[pb.PortNum]int{
	pb.PortNum_TEXT_MESSAGE_APP:            5, // chat — preserve history
	pb.PortNum_TEXT_MESSAGE_COMPRESSED_APP: 5,
	pb.PortNum_NEIGHBORINFO_APP:            4, // rare; protect from eviction
	pb.PortNum_TRACEROUTE_APP:              3,
	pb.PortNum_POSITION_APP:                3,
	pb.PortNum_NODEINFO_APP:                2, // frequent; lower priority
	pb.PortNum_TELEMETRY_APP:               2,
	pb.PortNum_ROUTING_APP:                 2,
	pb.PortNum_MAP_REPORT_APP:              2,
}

// defaultTypePriority applies to any port type not listed above.
const defaultTypePriority = 1

// isRouterRole returns true for device roles that act as infrastructure nodes.
// These nodes transmit position and node-info far less often than client nodes,
// so their state packets need elevated protection from eviction.
func isRouterRole(role pb.Config_DeviceConfig_Role) bool {
	switch role {
	case pb.Config_DeviceConfig_ROUTER,
		pb.Config_DeviceConfig_ROUTER_CLIENT,
		pb.Config_DeviceConfig_ROUTER_LATE:
		return true
	}
	return false
}

// entry wraps a packet with its cache insertion timestamp.
type entry struct {
	pkt        *meshtreampb.Packet
	insertedAt int64 // unix timestamp when this packet was added to the cache
}

// NodeAwareCache stores packets with two eviction axes:
//
//  1. Age protection: packets younger than minEvictAge are never evicted.
//     This keeps all recent traffic intact regardless of pressure.
//
//  2. Priority-based eviction for historical data: when the global cap is hit
//     and old packets must be removed, the cache evicts from the lowest-priority
//     type first. Within that tier it picks the packet whose source node was
//     most recently active — a Bélády approximation: the node that sent recently
//     is most likely to resend, so its old packet is cheapest to lose. Silent
//     nodes' (flaky/distant) historical packets are thus protected.
//
// Node retention: once a node has been silent for [retention], its packets are
// excluded from GetAll and proactively pruned when the cache is under pressure.
// Router nodes (ROUTER, ROUTER_CLIENT, ROUTER_LATE) are exempt from retention
// pruning — they transmit far less frequently and their state must be preserved.
//
// Packets with from=0 (no identified source node) are always included in GetAll.
// They are never associated with a node's send rate, so they survive eviction
// longer than packets from chatty nodes within the same priority tier.
type NodeAwareCache struct {
	mu           sync.Mutex
	entries      []entry
	nodeLastSeen map[uint32]int64 // nodeID → unix timestamp of most recent packet
	routerNodes  map[uint32]bool  // nodeIDs identified as router-role devices
	maxSize      int              // global safety cap
	retention    time.Duration
	nowFunc      func() time.Time // injectable for testing
}

// NewNodeAwareCache creates a cache with the given safety cap and node
// retention window.
func NewNodeAwareCache(maxSize int, retention time.Duration) *NodeAwareCache {
	return &NodeAwareCache{
		entries:      make([]entry, 0, min(maxSize, 256)),
		nodeLastSeen: make(map[uint32]int64),
		routerNodes:  make(map[uint32]bool),
		maxSize:      maxSize,
		retention:    retention,
		nowFunc:      time.Now,
	}
}

// packetPriority returns the eviction priority for p. Router nodes' position
// and node-info packets are elevated to priority 4 (equal to NEIGHBORINFO_APP)
// because those nodes transmit far less frequently and their state is harder to
// replace.
// Must be called with c.mu held.
func (c *NodeAwareCache) packetPriority(p *meshtreampb.Packet) int {
	port := p.GetData().GetPortNum()
	if c.routerNodes[p.GetData().GetFrom()] {
		switch port {
		case pb.PortNum_POSITION_APP, pb.PortNum_NODEINFO_APP:
			return 4 // elevated: same tier as NEIGHBORINFO_APP
		}
	}
	if pri, ok := typePriority[port]; ok {
		return pri
	}
	return defaultTypePriority
}

// Add records a packet. Recent packets (younger than minEvictAge) are never
// evicted. When the global cap is hit, stale-node packets are pruned first;
// if still over the limit, the best historical eviction candidate is removed.
func (c *NodeAwareCache) Add(packet *meshtreampb.Packet) {
	c.mu.Lock()
	defer c.mu.Unlock()

	nodeID := packet.GetData().GetFrom()
	nowUnix := c.nowFunc().Unix()

	if nodeID != 0 {
		c.nodeLastSeen[nodeID] = nowUnix

		// Keep router-node membership up to date from NODEINFO_APP packets.
		if packet.GetData().GetPortNum() == pb.PortNum_NODEINFO_APP {
			if user := packet.GetData().GetNodeInfo(); user != nil {
				if isRouterRole(user.GetRole()) {
					c.routerNodes[nodeID] = true
				} else {
					delete(c.routerNodes, nodeID)
				}
			}
		}
	}

	c.entries = append(c.entries, entry{pkt: packet, insertedAt: nowUnix})

	if len(c.entries) > c.maxSize {
		c.pruneStale(nowUnix)
		if len(c.entries) > c.maxSize {
			c.evict(nowUnix)
		}
	}
}

// GetAll returns all cached packets whose source node was active within the
// retention window. Packets with no source node (from=0) are always included.
// Returned in arrival order.
func (c *NodeAwareCache) GetAll() []*meshtreampb.Packet {
	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.entries) == 0 {
		return []*meshtreampb.Packet{}
	}

	cutoff := c.nowFunc().Unix() - int64(c.retention.Seconds())

	activeNodes := make(map[uint32]bool, len(c.nodeLastSeen))
	for nodeID, lastSeen := range c.nodeLastSeen {
		if c.routerNodes[nodeID] || lastSeen >= cutoff {
			activeNodes[nodeID] = true
		}
	}

	result := make([]*meshtreampb.Packet, 0, len(c.entries))
	for _, e := range c.entries {
		nodeID := e.pkt.GetData().GetFrom()
		if nodeID == 0 || activeNodes[nodeID] {
			result = append(result, e.pkt)
		}
	}
	return result
}

// evict removes the best eviction candidate. It first tries entries old enough
// to be eligible (insertedAt ≤ nowUnix - minEvictAge); if none qualify it falls
// back to all entries so the cap is always enforced.
// Must be called with c.mu held.
func (c *NodeAwareCache) evict(nowUnix int64) {
	ageThreshold := nowUnix - int64(minEvictAge.Seconds())

	idx := c.pickEvictTarget(ageThreshold)
	if idx < 0 {
		// All entries are recent; cap must still be enforced.
		idx = c.pickEvictTarget(-1)
	}
	if idx < 0 {
		return
	}
	c.entries = append(c.entries[:idx], c.entries[idx+1:]...)
}

// pickEvictTarget returns the index of the best eviction candidate among entries
// with insertedAt ≤ ageThreshold. Pass ageThreshold = -1 to consider all entries.
//
// Selection criteria (in order):
//  1. Lowest priority tier — least important packet types go first.
//  2. Most recently active source node — that node is most likely to resend,
//     so its old packet is cheapest to lose (Bélády approximation).
//     Packets from=0 have nodeLastSeen=0 and are thus the last resort within
//     a tier (they have no source that will refresh them).
//
// Returns -1 if no qualifying entries exist.
func (c *NodeAwareCache) pickEvictTarget(ageThreshold int64) int {
	// First pass: find minimum priority among qualifying entries.
	minPri := -1
	for _, e := range c.entries {
		if ageThreshold >= 0 && e.insertedAt > ageThreshold {
			continue
		}
		if pri := c.packetPriority(e.pkt); minPri < 0 || pri < minPri {
			minPri = pri
		}
	}
	if minPri < 0 {
		return -1 // no qualifying entries
	}

	// Second pass: among qualifying entries at minPri, pick the one from the
	// most recently active source node (highest nodeLastSeen).
	bestIdx := -1
	bestLastSeen := int64(-1)
	for i, e := range c.entries {
		if ageThreshold >= 0 && e.insertedAt > ageThreshold {
			continue
		}
		if c.packetPriority(e.pkt) != minPri {
			continue
		}
		nodeID := e.pkt.GetData().GetFrom()
		lastSeen := c.nodeLastSeen[nodeID] // 0 for from=0 packets
		if bestIdx < 0 || lastSeen > bestLastSeen {
			bestIdx = i
			bestLastSeen = lastSeen
		}
	}
	return bestIdx
}

// pruneStale removes all packets from nodes that haven't been heard within the
// retention window, and cleans up their tracking entries.
// Must be called with c.mu held.
func (c *NodeAwareCache) pruneStale(nowUnix int64) {
	cutoff := nowUnix - int64(c.retention.Seconds())

	stale := make(map[uint32]bool)
	for nodeID, lastSeen := range c.nodeLastSeen {
		if !c.routerNodes[nodeID] && lastSeen < cutoff {
			stale[nodeID] = true
			delete(c.nodeLastSeen, nodeID)
		}
	}
	if len(stale) == 0 {
		return
	}

	// Filter entries in-place.
	out := c.entries[:0]
	for _, e := range c.entries {
		if nodeID := e.pkt.GetData().GetFrom(); nodeID == 0 || !stale[nodeID] {
			out = append(out, e)
		}
	}
	c.entries = out
}

// ── Broker ────────────────────────────────────────────────────────────────────

// Broker distributes messages from a source channel to multiple subscriber channels.
type Broker struct {
	sourceChan      <-chan *meshtreampb.Packet
	subscribers     map[chan *meshtreampb.Packet]struct{}
	subscriberMutex sync.RWMutex
	done            chan struct{}
	wg              sync.WaitGroup
	logger          logging.Logger
	cache           *NodeAwareCache
}

// NewBroker creates a new broker. cacheSize is the global safety cap on total
// retained packets; retention controls per-node eviction after silence.
func NewBroker(sourceChannel <-chan *meshtreampb.Packet, cacheSize int, retention time.Duration, logger logging.Logger) *Broker {
	broker := &Broker{
		sourceChan:  sourceChannel,
		subscribers: make(map[chan *meshtreampb.Packet]struct{}),
		done:        make(chan struct{}),
		logger:      logger.Named("mqtt.broker"),
		cache:       NewNodeAwareCache(cacheSize, retention),
	}

	broker.wg.Add(1)
	go broker.dispatchLoop()

	return broker
}

// Subscribe creates and returns a new subscriber channel. The subscriber
// immediately receives all currently cached packets.
func (b *Broker) Subscribe(bufferSize int) <-chan *meshtreampb.Packet {
	subscriberChan := make(chan *meshtreampb.Packet, bufferSize)

	b.subscriberMutex.Lock()
	b.subscribers[subscriberChan] = struct{}{}
	b.subscriberMutex.Unlock()

	cachedPackets := b.cache.GetAll()
	if len(cachedPackets) > 0 {
		go func() {
			defer func() {
				if r := recover(); r != nil {
					b.logger.Warn("Recovered from panic when sending cached packets, channel likely closed")
				}
			}()

			for _, packet := range cachedPackets {
				select {
				case subscriberChan <- packet:
				case <-time.After(cacheGracePeriod):
					b.logger.Warn("Timeout when sending cached packet to new subscriber")
					return
				}
			}
		}()
	}

	return subscriberChan
}

// Unsubscribe removes a subscriber and closes its channel.
func (b *Broker) Unsubscribe(ch <-chan *meshtreampb.Packet) {
	b.subscriberMutex.Lock()
	defer b.subscriberMutex.Unlock()

	for subCh := range b.subscribers {
		if subCh == ch {
			delete(b.subscribers, subCh)
			close(subCh)
			return
		}
	}

	b.logger.Warn("Subscriber channel not found - cannot unsubscribe")
}

// Close shuts down the broker and closes all subscriber channels.
func (b *Broker) Close() {
	close(b.done)
	b.wg.Wait()

	b.subscriberMutex.Lock()
	defer b.subscriberMutex.Unlock()

	for ch := range b.subscribers {
		close(ch)
	}
	b.subscribers = make(map[chan *meshtreampb.Packet]struct{})
}

// dispatchLoop continuously reads from the source channel and distributes to subscribers.
func (b *Broker) dispatchLoop() {
	defer b.wg.Done()

	for {
		select {
		case <-b.done:
			return

		case packet, ok := <-b.sourceChan:
			if !ok {
				// Source channel has been closed — run Close in a goroutine to avoid
				// deadlocking (Close calls wg.Wait, but we are the goroutine in the wg).
				b.logger.Info("Source channel closed, shutting down broker")
				go b.Close()
				return
			}

			b.cache.Add(packet)
			b.broadcast(packet)
		}
	}
}

// broadcast sends a packet to all active subscribers without blocking.
func (b *Broker) broadcast(packet *meshtreampb.Packet) {
	b.subscriberMutex.RLock()
	subscribers := make([]chan *meshtreampb.Packet, 0, len(b.subscribers))
	for ch := range b.subscribers {
		subscribers = append(subscribers, ch)
	}
	b.subscriberMutex.RUnlock()

	for _, ch := range subscribers {
		go func(ch chan *meshtreampb.Packet) {
			defer func() {
				if r := recover(); r != nil {
					b.logger.Warn("Recovered from panic in broadcast, channel likely closed")
				}
			}()

			select {
			case ch <- packet:
			default:
				b.logger.Warn("Subscriber buffer full, dropping message")
			}
		}(ch)
	}
}
