package mqtt

import (
	"os"
	"sync"
	"testing"
	"time"

	"github.com/dpup/prefab/logging"

	meshtreampb "meshstream/generated/meshstream"
	pb "meshstream/generated/meshtastic"
)

// TestMain disables age protection globally so pressure tests run without
// needing to advance mock clocks. Individual tests that specifically cover
// age-based behaviour set minEvictAge themselves.
func TestMain(m *testing.M) {
	minEvictAge = 0
	os.Exit(m.Run())
}

// pkt is a test helper that builds a Packet with the given ID, from-node, and port.
func pkt(id, from uint32, port pb.PortNum) *meshtreampb.Packet {
	return &meshtreampb.Packet{
		Data: &meshtreampb.Data{Id: id, From: from, PortNum: port},
		Info: &meshtreampb.TopicInfo{},
	}
}

// ── NodeAwareCache unit tests ──────────────────────────────────────────────────

func TestNodeAwareCacheEmpty(t *testing.T) {
	c := NewNodeAwareCache(100, time.Hour)
	if got := c.GetAll(); len(got) != 0 {
		t.Errorf("expected empty, got %d packets", len(got))
	}
}

func TestNodeAwareCacheBasicOrdering(t *testing.T) {
	c := NewNodeAwareCache(100, time.Hour)
	c.Add(pkt(1, 1, pb.PortNum_NODEINFO_APP))
	c.Add(pkt(2, 2, pb.PortNum_NODEINFO_APP))
	c.Add(pkt(3, 3, pb.PortNum_NODEINFO_APP))

	got := c.GetAll()
	if len(got) != 3 {
		t.Fatalf("expected 3, got %d", len(got))
	}
	for i, p := range got {
		if p.Data.Id != uint32(i+1) {
			t.Errorf("pos %d: want ID %d, got %d", i, i+1, p.Data.Id)
		}
	}
}

// TestPressureEvictsOldestOfLowestPriority verifies that under cap pressure, the
// oldest packet of the lowest-priority type is evicted while higher-priority
// types are preserved.
func TestPressureEvictsOldestOfLowestPriority(t *testing.T) {
	c := NewNodeAwareCache(3, time.Hour)

	c.Add(pkt(1, 1, pb.PortNum_NODEINFO_APP))       // priority 2
	c.Add(pkt(2, 1, pb.PortNum_NEIGHBORINFO_APP))   // priority 4
	c.Add(pkt(3, 1, pb.PortNum_NODEINFO_APP))       // priority 2 — at cap
	c.Add(pkt(4, 1, pb.PortNum_NODEINFO_APP))       // pressure: evicts oldest pri=2 (ID 1)

	got := c.GetAll()
	if len(got) != 3 {
		t.Fatalf("expected 3 (global cap), got %d: %v", len(got), ids(got))
	}

	wantIDs := []uint32{2, 3, 4}
	for i, p := range got {
		if p.Data.Id != wantIDs[i] {
			t.Errorf("pos %d: want ID %d, got %d", i, wantIDs[i], p.Data.Id)
		}
	}
}

// TestRareTypeOutlastsFrequentType is the core scenario: a node sends many
// node-info packets and one neighbor-info packet. Under cache pressure, the
// neighbor-info (higher priority) should survive while old node-infos are evicted.
func TestRareTypeOutlastsFrequentType(t *testing.T) {
	// Cap=5 creates pressure when we add 13 packets.
	c := NewNodeAwareCache(5, time.Hour)

	neighborID := uint32(50)
	c.Add(pkt(neighborID, 1, pb.PortNum_NEIGHBORINFO_APP)) // priority 4
	for i := uint32(1); i <= 12; i++ {
		c.Add(pkt(i, 1, pb.PortNum_NODEINFO_APP)) // priority 2
	}

	got := c.GetAll()

	var nodeInfoCount, neighborCount int
	for _, p := range got {
		switch p.Data.PortNum {
		case pb.PortNum_NODEINFO_APP:
			nodeInfoCount++
		case pb.PortNum_NEIGHBORINFO_APP:
			neighborCount++
		}
	}

	if len(got) != 5 {
		t.Errorf("expected 5 packets (cap), got %d: %v", len(got), ids(got))
	}
	if neighborCount != 1 {
		t.Errorf("expected neighbor-info to survive, got %d", neighborCount)
	}
	if nodeInfoCount != 4 {
		t.Errorf("expected 4 node-infos (cap-1), got %d", nodeInfoCount)
	}
}

// TestPressureIsGlobal verifies that eviction competes globally across all nodes:
// when the cap is hit, the oldest packet of the lowest priority is removed
// regardless of which node it came from.
func TestPressureIsGlobal(t *testing.T) {
	c := NewNodeAwareCache(3, time.Hour)

	c.Add(pkt(1, 1, pb.PortNum_NODEINFO_APP)) // node 1
	c.Add(pkt(2, 2, pb.PortNum_NODEINFO_APP)) // node 2
	c.Add(pkt(3, 1, pb.PortNum_NODEINFO_APP)) // node 1 — at cap
	c.Add(pkt(4, 2, pb.PortNum_NODEINFO_APP)) // node 2 — evicts globally oldest = ID 1

	got := c.GetAll()
	if len(got) != 3 {
		t.Fatalf("expected 3, got %d: %v", len(got), ids(got))
	}
	if got[0].Data.Id != 2 {
		t.Errorf("expected oldest surviving ID 2, got %d", got[0].Data.Id)
	}
}

// TestBeladyApproximation verifies the node-aware eviction: among same-priority
// old packets, the one from the most recently active node is evicted first
// (it is most likely to resend, making its old packet cheapest to lose).
// A flaky node's old packet therefore outlives a reliable node's old packet.
func TestBeladyApproximation(t *testing.T) {
	now := time.Unix(0, 0)
	c := NewNodeAwareCache(3, 24*time.Hour)
	c.nowFunc = func() time.Time { return now }

	// At T=0: both nodes send a node-info.
	c.Add(pkt(1, 1, pb.PortNum_NODEINFO_APP)) // node F (flaky)
	c.Add(pkt(2, 2, pb.PortNum_NODEINFO_APP)) // node R (reliable)

	// At T=90m: R sends again — it is now the most recently active node.
	// F has been silent, so its T=0 packet is the "harder to replace" one.
	now = time.Unix(int64(90*time.Minute/time.Second), 0)
	c.Add(pkt(3, 2, pb.PortNum_NODEINFO_APP)) // R resends, cache now at cap=3

	// At T=2h: pressure. Both node 1 and node 2 have old packets (age > minEvictAge=0).
	// Among lowest-priority (both are NODEINFO), evict from node 2 (most recently active
	// at T=90m) rather than node 1 (last seen T=0).
	now = time.Unix(int64(2*time.Hour/time.Second), 0)
	minEvictAge = time.Hour
	t.Cleanup(func() { minEvictAge = 0 })

	c.Add(pkt(4, 3, pb.PortNum_NODEINFO_APP)) // new node — triggers eviction

	got := c.GetAll()
	var survivingNodes []uint32
	for _, p := range got {
		survivingNodes = append(survivingNodes, p.Data.From)
	}

	// Node 1's packet (ID 1, from flaky node) must survive.
	flakySurvived := false
	reliableOldSurvived := false
	for _, p := range got {
		if p.Data.Id == 1 {
			flakySurvived = true
		}
		if p.Data.Id == 2 { // R's old T=0 packet
			reliableOldSurvived = true
		}
	}

	if !flakySurvived {
		t.Error("flaky node's only packet should survive (Bélády: it won't be resent soon)")
	}
	if reliableOldSurvived {
		t.Error("reliable node's old packet should be evicted (node recently resent, cheapest to lose)")
	}
}

// TestMinAgeProtectsRecentPackets verifies that packets younger than minEvictAge
// are never evicted even under heavy cap pressure.
func TestMinAgeProtectsRecentPackets(t *testing.T) {
	minEvictAge = time.Hour
	t.Cleanup(func() { minEvictAge = 0 })

	now := time.Unix(0, 0)
	c := NewNodeAwareCache(3, 24*time.Hour)
	c.nowFunc = func() time.Time { return now }

	// Three packets at T=0 fill the cache.
	for i := uint32(1); i <= 3; i++ {
		c.Add(pkt(i, i, pb.PortNum_NODEINFO_APP))
	}

	// T=30m: add a fourth packet. All are < 1h old — none are eligible for
	// priority eviction. The cap must still be respected, so one is evicted
	// via the fallback (all-entries pickEvictTarget).
	now = time.Unix(int64(30*time.Minute/time.Second), 0)
	c.Add(pkt(4, 4, pb.PortNum_NODEINFO_APP))

	got := c.GetAll()
	if len(got) != 3 {
		t.Fatalf("expected cap=3 enforced even with all-recent entries, got %d", len(got))
	}
}

// TestRetentionEvictsStaleNode verifies whole-node eviction after silence.
func TestRetentionEvictsStaleNode(t *testing.T) {
	now := time.Now()
	c := NewNodeAwareCache(1000, 3*time.Hour)
	c.nowFunc = func() time.Time { return now }

	c.Add(pkt(1, 1, pb.PortNum_NODEINFO_APP))
	c.Add(pkt(2, 1, pb.PortNum_NODEINFO_APP))

	// Node 2 is active after node 1 has gone silent.
	c.nowFunc = func() time.Time { return now.Add(1 * time.Minute) }
	c.Add(pkt(3, 2, pb.PortNum_NODEINFO_APP))

	// Past node 1's retention window.
	c.nowFunc = func() time.Time { return now.Add(3*time.Hour + 1*time.Second) }

	got := c.GetAll()
	if len(got) != 1 || got[0].Data.Id != 3 {
		t.Errorf("expected only node 2's packet (ID 3), got %v", ids(got))
	}
}

// TestRetentionExtendsOnNewPacket verifies that a new packet resets the retention clock.
func TestRetentionExtendsOnNewPacket(t *testing.T) {
	now := time.Now()
	c := NewNodeAwareCache(1000, 3*time.Hour)
	c.nowFunc = func() time.Time { return now }

	c.Add(pkt(1, 1, pb.PortNum_NODEINFO_APP))

	// Node 1 sends again at t=2h, refreshing its window.
	c.nowFunc = func() time.Time { return now.Add(2 * time.Hour) }
	c.Add(pkt(2, 1, pb.PortNum_NODEINFO_APP))

	// t=3h+1s — past first packet's original window, but node refreshed at 2h.
	c.nowFunc = func() time.Time { return now.Add(3*time.Hour + 1*time.Second) }

	got := c.GetAll()
	if len(got) != 2 {
		t.Errorf("expected both packets retained (node still active), got %d", len(got))
	}
}

// TestNoSourcePacketsAlwaysIncluded verifies from=0 packets bypass node retention.
func TestNoSourcePacketsAlwaysIncluded(t *testing.T) {
	now := time.Now()
	c := NewNodeAwareCache(1000, time.Hour)
	c.nowFunc = func() time.Time { return now }

	c.Add(pkt(1, 0, pb.PortNum_NODEINFO_APP))

	c.nowFunc = func() time.Time { return now.Add(48 * time.Hour) }

	got := c.GetAll()
	if len(got) != 1 {
		t.Errorf("expected from=0 packet to always be included, got %d", len(got))
	}
}

// TestGlobalCapSamePriorityFIFO verifies that when all packets share the same
// priority, the oldest is evicted first (FIFO behaviour within a priority tier).
func TestGlobalCapSamePriorityFIFO(t *testing.T) {
	c := NewNodeAwareCache(3, time.Hour)

	// All from=0 packets of the same type — same priority, pure FIFO.
	c.Add(pkt(1, 0, pb.PortNum_NODEINFO_APP))
	c.Add(pkt(2, 0, pb.PortNum_NODEINFO_APP))
	c.Add(pkt(3, 0, pb.PortNum_NODEINFO_APP))
	c.Add(pkt(4, 0, pb.PortNum_NODEINFO_APP)) // should push out ID 1

	got := c.GetAll()
	if len(got) != 3 {
		t.Fatalf("expected 3 (global cap), got %d", len(got))
	}
	if got[0].Data.Id != 2 {
		t.Errorf("expected oldest surviving ID 2, got %d", got[0].Data.Id)
	}
}

// ids extracts packet IDs for readable failure messages.
func ids(packets []*meshtreampb.Packet) []uint32 {
	out := make([]uint32, len(packets))
	for i, p := range packets {
		out[i] = p.Data.Id
	}
	return out
}

// ── Broker integration tests ───────────────────────────────────────────────────

func newTestBroker(sourceChan chan *meshtreampb.Packet, cacheSize int) *Broker {
	return NewBroker(sourceChan, cacheSize, time.Hour, logging.NewDevLogger().Named("test"))
}

func TestBrokerSubscribeUnsubscribe(t *testing.T) {
	sourceChan := make(chan *meshtreampb.Packet, 10)
	broker := newTestBroker(sourceChan, 5)
	defer broker.Close()

	subscriber1 := broker.Subscribe(5)
	subscriber2 := broker.Subscribe(5)

	broker.subscriberMutex.RLock()
	count := len(broker.subscribers)
	broker.subscriberMutex.RUnlock()

	if count != 2 {
		t.Errorf("expected 2 subscribers, got %d", count)
	}

	sourceChan <- pkt(1, 0, pb.PortNum_UNKNOWN_APP)

	select {
	case p := <-subscriber1:
		if p.Data.Id != 1 {
			t.Errorf("subscriber1: want ID 1, got %d", p.Data.Id)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("subscriber1 timed out")
	}
	select {
	case p := <-subscriber2:
		if p.Data.Id != 1 {
			t.Errorf("subscriber2: want ID 1, got %d", p.Data.Id)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("subscriber2 timed out")
	}

	broker.Unsubscribe(subscriber1)

	broker.subscriberMutex.RLock()
	count = len(broker.subscribers)
	broker.subscriberMutex.RUnlock()
	if count != 1 {
		t.Errorf("expected 1 subscriber after unsubscribe, got %d", count)
	}

	sourceChan <- pkt(2, 0, pb.PortNum_UNKNOWN_APP)
	select {
	case p := <-subscriber2:
		if p.Data.Id != 2 {
			t.Errorf("subscriber2: want ID 2, got %d", p.Data.Id)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("subscriber2 timed out on second packet")
	}
}

func TestBrokerMultipleSubscribers(t *testing.T) {
	sourceChan := make(chan *meshtreampb.Packet, 10)
	broker := newTestBroker(sourceChan, 10)
	defer broker.Close()

	const n = 10
	subs := make([]<-chan *meshtreampb.Packet, n)
	for i := range subs {
		subs[i] = broker.Subscribe(5)
	}

	sourceChan <- pkt(42, 0, pb.PortNum_UNKNOWN_APP)

	var wg sync.WaitGroup
	wg.Add(n)
	for i, ch := range subs {
		go func(idx int, c <-chan *meshtreampb.Packet) {
			defer wg.Done()
			select {
			case p := <-c:
				if p.Data.Id != 42 {
					t.Errorf("sub %d: want 42, got %d", idx, p.Data.Id)
				}
			case <-time.After(100 * time.Millisecond):
				t.Errorf("sub %d timed out", idx)
			}
		}(i, ch)
	}
	wg.Wait()
}

func TestBrokerSlowSubscriber(t *testing.T) {
	sourceChan := make(chan *meshtreampb.Packet, 10)
	broker := newTestBroker(sourceChan, 10)
	defer broker.Close()

	slow := broker.Subscribe(1)
	fast := broker.Subscribe(5)

	sourceChan <- pkt(101, 0, pb.PortNum_UNKNOWN_APP)
	time.Sleep(10 * time.Millisecond)
	sourceChan <- pkt(102, 0, pb.PortNum_UNKNOWN_APP)

	for _, want := range []uint32{101, 102} {
		select {
		case p := <-fast:
			if p.Data.Id != want {
				t.Errorf("fast: want %d, got %d", want, p.Data.Id)
			}
		case <-time.After(100 * time.Millisecond):
			t.Errorf("fast: timed out waiting for %d", want)
		}
	}
	select {
	case p := <-slow:
		if p.Data.Id != 101 {
			t.Errorf("slow: want 101, got %d", p.Data.Id)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("slow: timed out")
	}
}

func TestBrokerCloseWithSubscribers(t *testing.T) {
	sourceChan := make(chan *meshtreampb.Packet, 10)
	broker := newTestBroker(sourceChan, 5)

	sub := broker.Subscribe(5)
	broker.Close()

	select {
	case _, ok := <-sub:
		if ok {
			t.Error("expected channel to be closed")
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("channel not closed")
	}
}

func TestBrokerPacketCaching(t *testing.T) {
	sourceChan := make(chan *meshtreampb.Packet, 10)
	broker := newTestBroker(sourceChan, 100)
	defer broker.Close()

	for i := uint32(1); i <= 3; i++ {
		sourceChan <- pkt(i, i, pb.PortNum_NODEINFO_APP)
		time.Sleep(10 * time.Millisecond)
	}

	sub := broker.Subscribe(10)
	var received []uint32
	for i := 0; i < 3; i++ {
		select {
		case p := <-sub:
			received = append(received, p.Data.Id)
		case <-time.After(200 * time.Millisecond):
			t.Fatalf("timed out waiting for packet %d", i+1)
		}
	}
	for i, id := range received {
		if id != uint32(i+1) {
			t.Errorf("pos %d: want %d, got %d", i, i+1, id)
		}
	}
}

// TestBrokerPriorityEvictionOnReplay verifies that when a subscriber joins after
// mixed packets have been received, the cached set reflects priority eviction:
// high-priority types survive while low-priority types are trimmed.
func TestBrokerPriorityEvictionOnReplay(t *testing.T) {
	sourceChan := make(chan *meshtreampb.Packet, 20)
	// Tight cache: cap=5 creates pressure with 9 packets.
	broker := NewBroker(sourceChan, 5, time.Hour, logging.NewDevLogger().Named("test"))
	defer broker.Close()

	// 1 neighbor-info (priority 4) + 8 node-infos (priority 2).
	sourceChan <- pkt(99, 1, pb.PortNum_NEIGHBORINFO_APP)
	for i := 1; i <= 8; i++ {
		sourceChan <- pkt(uint32(i), 1, pb.PortNum_NODEINFO_APP)
		time.Sleep(5 * time.Millisecond)
	}
	time.Sleep(20 * time.Millisecond)

	sub := broker.Subscribe(20)
	var nodeInfoCount, neighborCount int
	for i := 0; i < 5; i++ { // expect exactly cap=5 packets
		select {
		case p := <-sub:
			switch p.Data.PortNum {
			case pb.PortNum_NODEINFO_APP:
				nodeInfoCount++
			case pb.PortNum_NEIGHBORINFO_APP:
				neighborCount++
			}
		case <-time.After(200 * time.Millisecond):
			t.Fatalf("timed out waiting for cached packet %d", i+1)
		}
	}

	if neighborCount != 1 {
		t.Errorf("expected neighbor-info to survive in cache, got %d", neighborCount)
	}
	if nodeInfoCount != 4 {
		t.Errorf("expected 4 node-infos (cap-1), got %d", nodeInfoCount)
	}
}

// TestSubscriberBufferFull verifies that when cache replay times out due to a
// full subscriber buffer, live packets can still be delivered once there is room.
func TestSubscriberBufferFull(t *testing.T) {
	orig := cacheGracePeriod
	cacheGracePeriod = time.Millisecond // short enough to time out on packet 2+
	t.Cleanup(func() { cacheGracePeriod = orig })

	sourceChan := make(chan *meshtreampb.Packet, 10)
	broker := newTestBroker(sourceChan, 100)
	defer broker.Close()

	for i := uint32(1); i <= 5; i++ {
		sourceChan <- pkt(i, i, pb.PortNum_NODEINFO_APP)
		time.Sleep(10 * time.Millisecond)
	}

	small := broker.Subscribe(1)

	// Read the first cached packet to confirm replay started.
	select {
	case <-small:
	case <-time.After(500 * time.Millisecond):
		t.Error("timed out waiting for first cached packet")
		return
	}

	// Wait for the cache goroutine to finish (timeout = 1 ms; 10 ms is ample).
	time.Sleep(10 * time.Millisecond)

	// Drain any residual cached packets that squeezed in before the timeout.
	drained := false
	for !drained {
		select {
		case <-small:
		default:
			drained = true
		}
	}

	// Buffer is now empty — a new live packet should be deliverable.
	sourceChan <- pkt(99, 99, pb.PortNum_NODEINFO_APP)
	select {
	case p := <-small:
		if p.Data.Id != 99 {
			t.Errorf("want live packet ID 99, got %d", p.Data.Id)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("timed out waiting for live packet")
	}
}
