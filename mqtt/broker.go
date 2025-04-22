package mqtt

import (
	"sync"

	"github.com/dpup/prefab/logging"
	meshtreampb "meshstream/generated/meshstream"
)

// Broker distributes messages from a source channel to multiple subscriber channels
type Broker struct {
	sourceChan      <-chan *meshtreampb.Packet            // Source of packets (e.g., from MQTT client)
	subscribers     map[chan *meshtreampb.Packet]struct{} // Active subscribers
	subscriberMutex sync.RWMutex              // Lock for modifying the subscribers map
	done            chan struct{}             // Signal to stop the dispatch loop
	wg              sync.WaitGroup            // Wait group to ensure clean shutdown
	logger          logging.Logger            // Logger for broker operations
}

// NewBroker creates a new broker that distributes messages from sourceChannel to subscribers
func NewBroker(sourceChannel <-chan *meshtreampb.Packet, logger logging.Logger) *Broker {
	broker := &Broker{
		sourceChan:  sourceChannel,
		subscribers: make(map[chan *meshtreampb.Packet]struct{}),
		done:        make(chan struct{}),
		logger:      logger.Named("mqtt.broker"),
	}

	// Start the dispatch loop
	broker.wg.Add(1)
	go broker.dispatchLoop()

	return broker
}

// Subscribe creates and returns a new subscriber channel
// The bufferSize parameter controls how many messages can be buffered in the channel
func (b *Broker) Subscribe(bufferSize int) <-chan *meshtreampb.Packet {
	// Create a new channel for this subscriber
	subscriberChan := make(chan *meshtreampb.Packet, bufferSize)

	// Register the new subscriber
	b.subscriberMutex.Lock()
	b.subscribers[subscriberChan] = struct{}{}
	b.subscriberMutex.Unlock()

	// Return the channel
	return subscriberChan
}

// Unsubscribe removes a subscriber and closes its channel
func (b *Broker) Unsubscribe(ch <-chan *meshtreampb.Packet) {
	b.subscriberMutex.Lock()
	defer b.subscriberMutex.Unlock()

	// Find the channel in our subscribers map
	for subCh := range b.subscribers {
		if subCh == ch {
			delete(b.subscribers, subCh)
			close(subCh)
			return
		}
	}

	// If we get here, the channel wasn't found
	b.logger.Warn("Subscriber channel not found - cannot unsubscribe")
}

// Close shuts down the broker and closes all subscriber channels
func (b *Broker) Close() {
	// Signal the dispatch loop to stop
	close(b.done)

	// Wait for the dispatch loop to exit
	b.wg.Wait()

	// Close all subscriber channels
	b.subscriberMutex.Lock()
	defer b.subscriberMutex.Unlock()

	for ch := range b.subscribers {
		close(ch)
	}
	b.subscribers = make(map[chan *meshtreampb.Packet]struct{})
}

// dispatchLoop continuously reads from the source channel and distributes to subscribers
func (b *Broker) dispatchLoop() {
	defer b.wg.Done()

	for {
		select {
		case <-b.done:
			// Broker is shutting down
			return

		case packet, ok := <-b.sourceChan:
			if !ok {
				// Source channel has been closed, shut down the broker
				b.logger.Info("Source channel closed, shutting down broker")
				b.Close()
				return
			}

			// Distribute the packet to all subscribers
			b.broadcast(packet)
		}
	}
}

// broadcast sends a packet to all active subscribers without blocking
func (b *Broker) broadcast(packet *meshtreampb.Packet) {
	// Take a read lock to get a snapshot of the subscribers
	b.subscriberMutex.RLock()
	subscribers := make([]chan *meshtreampb.Packet, 0, len(b.subscribers))
	for ch := range b.subscribers {
		subscribers = append(subscribers, ch)
	}
	b.subscriberMutex.RUnlock()

	// Distribute to all subscribers
	for _, ch := range subscribers {
		// Use a goroutine and recover to ensure sending to a closed channel doesn't panic
		go func(ch chan *meshtreampb.Packet) {
			defer func() {
				if r := recover(); r != nil {
					// This can happen if the channel was closed after we took a snapshot
					b.logger.Warn("Recovered from panic in broadcast, channel likely closed")
				}
			}()

			// Try to send without blocking
			select {
			case ch <- packet:
				// Message delivered successfully
			default:
				// Channel buffer is full, log warning and drop the message
				b.logger.Warn("Subscriber buffer full, dropping message")
			}
		}(ch)
	}
}
