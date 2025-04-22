package mqtt

import (
	"sync"
	"testing"
	"time"

	"github.com/dpup/prefab/logging"

	meshtreampb "meshstream/generated/meshstream"
)

// TestBrokerSubscribeUnsubscribe tests the basic subscribe and unsubscribe functionality
func TestBrokerSubscribeUnsubscribe(t *testing.T) {
	// Create a test source channel
	sourceChan := make(chan *Packet, 10)
	
	// Create a broker with the source channel
	testLogger := logging.NewDevLogger().Named("test")
	broker := NewBroker(sourceChan, testLogger)
	defer broker.Close()

	// Subscribe to the broker
	subscriber1 := broker.Subscribe(5)
	subscriber2 := broker.Subscribe(5)

	// Keep track of the internal broker state for testing
	broker.subscriberMutex.RLock()
	subscriberCount := len(broker.subscribers)
	broker.subscriberMutex.RUnlock()
	
	if subscriberCount != 2 {
		t.Errorf("Expected 2 subscribers, got %d", subscriberCount)
	}

	// We need to use sequential packets because our implementation is asynchronous
	// and exact packet matching may not work reliably
	
	// First packet with ID 1
	packet1 := &Packet{
		Packet: &meshtreampb.Packet{
			Data: &meshtreampb.Data{Id: 1},
			Info: &meshtreampb.TopicInfo{},
		},
	}
	
	// Send the packet
	sourceChan <- packet1

	// Both subscribers should receive the packet
	select {
	case received := <-subscriber1:
		if received.Data.Id != 1 {
			t.Errorf("Expected subscriber1 to receive packet with ID 1, got %d", received.Data.Id)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("subscriber1 didn't receive packet within timeout")
	}

	select {
	case received := <-subscriber2:
		if received.Data.Id != 1 {
			t.Errorf("Expected subscriber2 to receive packet with ID 1, got %d", received.Data.Id)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("subscriber2 didn't receive packet within timeout")
	}

	// Unsubscribe the first subscriber
	broker.Unsubscribe(subscriber1)
	
	// Verify the subscriber was removed
	broker.subscriberMutex.RLock()
	subscriberCount = len(broker.subscribers)
	broker.subscriberMutex.RUnlock()
	
	if subscriberCount != 1 {
		t.Errorf("Expected 1 subscriber after unsubscribe, got %d", subscriberCount)
	}

	// Second packet with ID 2
	packet2 := &Packet{
		Packet: &meshtreampb.Packet{
			Data: &meshtreampb.Data{Id: 2},
			Info: &meshtreampb.TopicInfo{},
		},
	}
	
	// Send the second packet
	sourceChan <- packet2

	// The second subscriber should receive the packet
	select {
	case received := <-subscriber2:
		if received.Data.Id != 2 {
			t.Errorf("Expected subscriber2 to receive packet with ID 2, got %d", received.Data.Id)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("subscriber2 didn't receive second packet within timeout")
	}
}

// TestBrokerMultipleSubscribers tests broadcasting to many subscribers
func TestBrokerMultipleSubscribers(t *testing.T) {
	// Create a test source channel
	sourceChan := make(chan *Packet, 10)
	
	// Create a broker with the source channel
	testLogger := logging.NewDevLogger().Named("test")
	broker := NewBroker(sourceChan, testLogger)
	defer broker.Close()

	// Create multiple subscribers
	const numSubscribers = 10
	subscribers := make([]<-chan *Packet, numSubscribers)
	for i := 0; i < numSubscribers; i++ {
		subscribers[i] = broker.Subscribe(5)
	}

	// Send a test packet with ID 42
	testPacket := &Packet{
		Packet: &meshtreampb.Packet{
			Data: &meshtreampb.Data{Id: 42},
			Info: &meshtreampb.TopicInfo{},
		},
	}
	sourceChan <- testPacket

	// All subscribers should receive the packet
	var wg sync.WaitGroup
	wg.Add(numSubscribers)

	for i, subscriber := range subscribers {
		go func(idx int, ch <-chan *Packet) {
			defer wg.Done()
			select {
			case received := <-ch:
				if received.Data.Id != 42 {
					t.Errorf("subscriber %d expected packet ID 42, got %d", idx, received.Data.Id)
				}
			case <-time.After(100 * time.Millisecond):
				t.Errorf("subscriber %d didn't receive packet within timeout", idx)
			}
		}(i, subscriber)
	}

	// Wait for all goroutines to complete
	wg.Wait()
}

// TestBrokerSlowSubscriber tests that a slow subscriber doesn't block others
func TestBrokerSlowSubscriber(t *testing.T) {
	// Create a test source channel
	sourceChan := make(chan *Packet, 10)
	
	// Create a broker with the source channel
	testLogger := logging.NewDevLogger().Named("test")
	broker := NewBroker(sourceChan, testLogger)
	defer broker.Close()

	// Create a slow subscriber with buffer size 1
	slowSubscriber := broker.Subscribe(1)
	
	// And a normal subscriber
	normalSubscriber := broker.Subscribe(5)
	
	// Verify we have two subscribers
	broker.subscriberMutex.RLock()
	subscriberCount := len(broker.subscribers)
	broker.subscriberMutex.RUnlock()
	
	if subscriberCount != 2 {
		t.Errorf("Expected 2 subscribers, got %d", subscriberCount)
	}

	// Send two packets quickly to fill the slow subscriber's buffer
	testPacket1 := &Packet{
		Packet: &meshtreampb.Packet{
			Data: &meshtreampb.Data{Id: 101},
			Info: &meshtreampb.TopicInfo{},
		},
	}
	testPacket2 := &Packet{
		Packet: &meshtreampb.Packet{
			Data: &meshtreampb.Data{Id: 102},
			Info: &meshtreampb.TopicInfo{},
		},
	}
	
	sourceChan <- testPacket1
	
	// Give the broker time to distribute the first packet
	time.Sleep(10 * time.Millisecond)
	
	sourceChan <- testPacket2

	// The normal subscriber should receive both packets
	select {
	case received := <-normalSubscriber:
		if received.Data.Id != 101 {
			t.Errorf("normalSubscriber expected packet ID 101, got %d", received.Data.Id)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("normalSubscriber didn't receive first packet within timeout")
	}

	select {
	case received := <-normalSubscriber:
		if received.Data.Id != 102 {
			t.Errorf("normalSubscriber expected packet ID 102, got %d", received.Data.Id)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("normalSubscriber didn't receive second packet within timeout")
	}

	// The slow subscriber should receive at least the first packet
	select {
	case received := <-slowSubscriber:
		if received.Data.Id != 101 {
			t.Errorf("slowSubscriber expected packet ID 101, got %d", received.Data.Id)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("slowSubscriber didn't receive first packet within timeout")
	}
}

// TestBrokerCloseWithSubscribers tests closing the broker with active subscribers
func TestBrokerCloseWithSubscribers(t *testing.T) {
	// Create a test source channel
	sourceChan := make(chan *Packet, 10)
	
	// Create a broker with the source channel
	testLogger := logging.NewDevLogger().Named("test")
	broker := NewBroker(sourceChan, testLogger)

	// Subscribe to the broker
	subscriber := broker.Subscribe(5)
	
	// Verify we have one subscriber
	broker.subscriberMutex.RLock()
	subscriberCount := len(broker.subscribers)
	broker.subscriberMutex.RUnlock()
	
	if subscriberCount != 1 {
		t.Errorf("Expected 1 subscriber, got %d", subscriberCount)
	}

	// Close the broker - this should close all subscriber channels
	broker.Close()

	// Trying to read from the subscriber channel should not block
	// since it should be closed
	select {
	case _, ok := <-subscriber:
		if ok {
			t.Error("Expected subscriber channel to be closed")
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("Subscriber channel should be closed but isn't")
	}
}