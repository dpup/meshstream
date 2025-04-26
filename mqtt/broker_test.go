package mqtt

import (
	"sync"
	"testing"
	"time"

	"github.com/dpup/prefab/logging"

	meshtreampb "meshstream/generated/meshstream"
)

// TestCircularBuffer tests the circular buffer implementation
func TestCircularBuffer(t *testing.T) {
	// Create a circular buffer with size 3
	buffer := NewCircularBuffer(3)

	// Test empty buffer returns empty slice
	packets := buffer.GetAll()
	if len(packets) != 0 {
		t.Errorf("Expected empty buffer to return empty slice, got %d items", len(packets))
	}

	// Add 3 packets and verify count
	for i := 1; i <= 3; i++ {
		packet := &meshtreampb.Packet{
			Data: &meshtreampb.Data{Id: uint32(i)},
			Info: &meshtreampb.TopicInfo{},
		}
		buffer.Add(packet)
	}

	// Check that buffer has 3 packets
	packets = buffer.GetAll()
	if len(packets) != 3 {
		t.Errorf("Expected buffer to have 3 packets, got %d", len(packets))
	}

	// Verify packets are in order
	for i, packet := range packets {
		expected := uint32(i + 1)
		if packet.Data.Id != expected {
			t.Errorf("Expected packet %d to have ID %d, got %d", i, expected, packet.Data.Id)
		}
	}

	// Add 2 more packets to test wrap-around
	for i := 4; i <= 5; i++ {
		packet := &meshtreampb.Packet{
			Data: &meshtreampb.Data{Id: uint32(i)},
			Info: &meshtreampb.TopicInfo{},
		}
		buffer.Add(packet)
	}

	// Check that buffer still has 3 packets (maxed out)
	packets = buffer.GetAll()
	if len(packets) != 3 {
		t.Errorf("Expected buffer to have 3 packets after overflow, got %d", len(packets))
	}

	// Verify packets are the latest ones in order (3, 4, 5)
	for i, packet := range packets {
		expected := uint32(i + 3)
		if packet.Data.Id != expected {
			t.Errorf("Expected packet %d to have ID %d, got %d", i, expected, packet.Data.Id)
		}
	}
}

// TestBrokerSubscribeUnsubscribe tests the basic subscribe and unsubscribe functionality
func TestBrokerSubscribeUnsubscribe(t *testing.T) {
	// Create a test source channel
	sourceChan := make(chan *meshtreampb.Packet, 10)
	
	// Create a broker with the source channel
	testLogger := logging.NewDevLogger().Named("test")
	broker := NewBroker(sourceChan, 5, testLogger)
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
	packet1 := &meshtreampb.Packet{
		Data: &meshtreampb.Data{Id: 1},
		Info: &meshtreampb.TopicInfo{},
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
	packet2 := &meshtreampb.Packet{
		Data: &meshtreampb.Data{Id: 2},
		Info: &meshtreampb.TopicInfo{},
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
	sourceChan := make(chan *meshtreampb.Packet, 10)
	
	// Create a broker with the source channel
	testLogger := logging.NewDevLogger().Named("test")
	broker := NewBroker(sourceChan, 5, testLogger)
	defer broker.Close()

	// Create multiple subscribers
	const numSubscribers = 10
	subscribers := make([]<-chan *meshtreampb.Packet, numSubscribers)
	for i := 0; i < numSubscribers; i++ {
		subscribers[i] = broker.Subscribe(5)
	}

	// Send a test packet with ID 42
	testPacket := &meshtreampb.Packet{
		Data: &meshtreampb.Data{Id: 42},
		Info: &meshtreampb.TopicInfo{},
	}
	sourceChan <- testPacket

	// All subscribers should receive the packet
	var wg sync.WaitGroup
	wg.Add(numSubscribers)

	for i, subscriber := range subscribers {
		go func(idx int, ch <-chan *meshtreampb.Packet) {
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
	sourceChan := make(chan *meshtreampb.Packet, 10)
	
	// Create a broker with the source channel
	testLogger := logging.NewDevLogger().Named("test")
	broker := NewBroker(sourceChan, 5, testLogger)
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
	testPacket1 := &meshtreampb.Packet{
		Data: &meshtreampb.Data{Id: 101},
		Info: &meshtreampb.TopicInfo{},
	}
	testPacket2 := &meshtreampb.Packet{
		Data: &meshtreampb.Data{Id: 102},
		Info: &meshtreampb.TopicInfo{},
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
	sourceChan := make(chan *meshtreampb.Packet, 10)
	
	// Create a broker with the source channel
	testLogger := logging.NewDevLogger().Named("test")
	broker := NewBroker(sourceChan, 5, testLogger)

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

// TestBrokerPacketCaching tests that the broker caches packets
func TestBrokerPacketCaching(t *testing.T) {
	// Create a test source channel
	sourceChan := make(chan *meshtreampb.Packet, 10)
	
	// Create a broker with a small cache size
	testLogger := logging.NewDevLogger().Named("test")
	broker := NewBroker(sourceChan, 3, testLogger)
	defer broker.Close()

	// Send three packets
	for i := 1; i <= 3; i++ {
		packet := &meshtreampb.Packet{
			Data: &meshtreampb.Data{Id: uint32(i)},
			Info: &meshtreampb.TopicInfo{},
		}
		sourceChan <- packet
		
		// Give the broker time to process the packet
		time.Sleep(10 * time.Millisecond)
	}

	// Create a subscriber after the packets were sent
	subscriber := broker.Subscribe(5)
	
	// The subscriber should receive all three cached packets
	receivedIds := make([]uint32, 0, 3)
	
	// We need to receive 3 packets
	for i := 0; i < 3; i++ {
		select {
		case received := <-subscriber:
			receivedIds = append(receivedIds, received.Data.Id)
		case <-time.After(100 * time.Millisecond):
			t.Errorf("Subscriber didn't receive cached packet %d within timeout", i+1)
		}
	}
	
	// Check that we received all packets in the correct order
	if len(receivedIds) != 3 {
		t.Errorf("Expected to receive 3 packets, got %d", len(receivedIds))
	} else {
		for i, id := range receivedIds {
			if id != uint32(i+1) {
				t.Errorf("Expected packet %d to have ID %d, got %d", i, i+1, id)
			}
		}
	}
}

// TestBrokerCacheOverflow tests that the broker correctly handles cache overflow
func TestBrokerCacheOverflow(t *testing.T) {
	// Create a test source channel
	sourceChan := make(chan *meshtreampb.Packet, 10)
	
	// Create a broker with a small cache size
	testLogger := logging.NewDevLogger().Named("test")
	cacheSize := 3
	broker := NewBroker(sourceChan, cacheSize, testLogger)
	defer broker.Close()

	// Send 5 packets (exceeding the cache size)
	for i := 1; i <= 5; i++ {
		packet := &meshtreampb.Packet{
			Data: &meshtreampb.Data{Id: uint32(i)},
			Info: &meshtreampb.TopicInfo{},
		}
		sourceChan <- packet
		
		// Give the broker time to process the packet
		time.Sleep(10 * time.Millisecond)
	}

	// Create a subscriber after the packets were sent
	subscriber := broker.Subscribe(5)
	
	// The subscriber should receive the last 3 packets (3, 4, 5)
	receivedIds := make([]uint32, 0, cacheSize)
	
	// We expect to receive exactly cacheSize packets
	for i := 0; i < cacheSize; i++ {
		select {
		case received := <-subscriber:
			receivedIds = append(receivedIds, received.Data.Id)
		case <-time.After(100 * time.Millisecond):
			t.Errorf("Subscriber didn't receive cached packet %d within timeout", i+1)
		}
	}
	
	// Verify no more packets are coming
	select {
	case received := <-subscriber:
		t.Errorf("Received unexpected packet with ID %d", received.Data.Id)
	case <-time.After(50 * time.Millisecond):
		// This is expected, no more packets should be received
	}
	
	// Check that we received only the last 3 packets in the correct order
	expectedIds := []uint32{3, 4, 5}
	if len(receivedIds) != len(expectedIds) {
		t.Errorf("Expected to receive %d packets, got %d", len(expectedIds), len(receivedIds))
	} else {
		for i, id := range receivedIds {
			if id != expectedIds[i] {
				t.Errorf("Expected packet %d to have ID %d, got %d", i, expectedIds[i], id)
			}
		}
	}
}

// TestSubscriberBufferFull tests the behavior when a subscriber's buffer is full
func TestSubscriberBufferFull(t *testing.T) {
	// Create a test source channel
	sourceChan := make(chan *meshtreampb.Packet, 10)
	
	// Create a broker with a cache size of 5
	testLogger := logging.NewDevLogger().Named("test")
	broker := NewBroker(sourceChan, 5, testLogger)
	defer broker.Close()

	// Prefill the cache with 5 packets
	for i := 1; i <= 5; i++ {
		packet := &meshtreampb.Packet{
			Data: &meshtreampb.Data{Id: uint32(i)},
			Info: &meshtreampb.TopicInfo{},
		}
		sourceChan <- packet
		time.Sleep(10 * time.Millisecond)
	}

	// Create a subscriber with a very small buffer size (1)
	smallSubscriber := broker.Subscribe(1)
	
	// The small subscriber should receive at least one cached packet
	// The others will be dropped because the buffer is full
	select {
	case received := <-smallSubscriber:
		if received.Data.Id != 1 {
			t.Errorf("Expected subscriber to receive packet with ID 1, got %d", received.Data.Id)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("Subscriber didn't receive any cached packet within timeout")
	}
	
	// Check that no more packets are immediately available
	// This is a bit tricky to test since we can't guarantee how many
	// packets were dropped due to the full buffer, but we can check
	// that the channel isn't immediately ready with more packets
	select {
	case received := <-smallSubscriber:
		// If we get here, it should be a later packet from the cache
		if received.Data.Id < 1 {
			t.Errorf("Received unexpected packet with ID %d", received.Data.Id)
		}
	case <-time.After(50 * time.Millisecond):
		// This is also acceptable - it means all attempts to send more cached
		// packets found the buffer full and gave up
	}

	// Send a new packet now that the subscriber is connected
	newPacket := &meshtreampb.Packet{
		Data: &meshtreampb.Data{Id: 6},
		Info: &meshtreampb.TopicInfo{},
	}
	sourceChan <- newPacket
	
	// The subscriber should receive this packet if they read the first one
	select {
	case received := <-smallSubscriber:
		if received.Data.Id != 6 {
			t.Errorf("Expected subscriber to receive packet with ID 6, got %d", received.Data.Id)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("Subscriber didn't receive new packet within timeout")
	}
}