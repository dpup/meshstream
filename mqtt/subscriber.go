package mqtt

import (
	"log"
	"sync"
)

// SubscriberConfig holds configuration for creating a subscriber
type SubscriberConfig struct {
	Name       string      // Descriptive name for the subscriber
	Broker     *Broker     // The broker to subscribe to
	BufferSize int         // Channel buffer size
	Processor  func(*Packet) // Function to process each packet
	StartHook  func()      // Optional hook called when starting
	CloseHook  func()      // Optional hook called when closing
}

// BaseSubscriber implements common subscriber functionality
type BaseSubscriber struct {
	broker     *Broker
	channel    <-chan *Packet
	done       chan struct{}
	wg         sync.WaitGroup
	name       string
	processor  func(*Packet)
	startHook  func()
	closeHook  func()
	BufferSize int
}

// NewBaseSubscriber creates a new base subscriber
func NewBaseSubscriber(config SubscriberConfig) *BaseSubscriber {
	return &BaseSubscriber{
		broker:     config.Broker,
		name:       config.Name,
		processor:  config.Processor,
		done:       make(chan struct{}),
		startHook:  config.StartHook,
		closeHook:  config.CloseHook,
		BufferSize: config.BufferSize,
	}
}

// Start begins subscriber processing
func (b *BaseSubscriber) Start() {
	// Subscribe to the broker
	b.channel = b.broker.Subscribe(b.BufferSize)
	
	// Call the start hook if provided
	if b.startHook != nil {
		b.startHook()
	}
	
	// Start the processing loop
	b.wg.Add(1)
	go b.run()
	
	log.Printf("Subscriber %s started", b.name)
}

// run processes messages from the channel
func (b *BaseSubscriber) run() {
	defer b.wg.Done()
	
	for {
		select {
		case packet, ok := <-b.channel:
			if !ok {
				// Channel closed
				log.Printf("Channel closed for subscriber %s", b.name)
				return
			}
			
			if packet != nil && b.processor != nil {
				b.processor(packet)
			}
			
		case <-b.done:
			log.Printf("Subscriber %s received shutdown signal", b.name)
			return
		}
	}
}

// Close stops the subscriber and releases resources
func (b *BaseSubscriber) Close() {
	log.Printf("Closing subscriber %s", b.name)
	
	// Signal the processing loop to stop
	close(b.done)
	
	// Unsubscribe from the broker
	b.broker.Unsubscribe(b.channel)
	
	// Wait for processing to finish
	b.wg.Wait()
	
	// Call the close hook if provided
	if b.closeHook != nil {
		b.closeHook()
	}
	
	log.Printf("Subscriber %s closed", b.name)
}

// Name returns the subscriber's name
func (b *BaseSubscriber) Name() string {
	return b.name
}