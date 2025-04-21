package mqtt

import (
	"fmt"
	"strings"
	"sync"
	"time"

	pb "meshstream/proto/generated/meshtastic"
)

// MessageStats tracks statistics about received messages
type MessageStats struct {
	sync.Mutex
	broker           *Broker
	subscriber       <-chan *Packet
	TotalMessages    int
	ByNode           map[uint32]int
	ByPortType       map[pb.PortNum]int
	LastStatsPrinted time.Time
	done             chan struct{}
	wg               sync.WaitGroup
}

// NewMessageStats creates a new MessageStats instance
func NewMessageStats(broker *Broker, printInterval time.Duration) *MessageStats {
	s := &MessageStats{
		broker:           broker,
		ByNode:           make(map[uint32]int),
		ByPortType:       make(map[pb.PortNum]int),
		LastStatsPrinted: time.Now(),
		done:             make(chan struct{}),
	}
	
	// Subscribe to the broker with a larger buffer to handle bursts
	s.subscriber = broker.Subscribe(50)
	
	// Start the collection loop
	s.wg.Add(1)
	go s.run(printInterval)
	
	return s
}

// run handles statistics collection and periodic printing
func (s *MessageStats) run(printInterval time.Duration) {
	defer s.wg.Done()
	
	// Create a ticker for periodically printing stats
	statsTicker := time.NewTicker(printInterval)
	defer statsTicker.Stop()
	
	for {
		select {
		case packet, ok := <-s.subscriber:
			if !ok {
				// Channel closed
				return
			}
			
			if packet != nil {
				s.recordMessage(packet)
			}
			
		case <-statsTicker.C:
			s.PrintStats()
			
		case <-s.done:
			return
		}
	}
}

// recordMessage records a message in the statistics
func (s *MessageStats) recordMessage(packet *Packet) {
	s.Lock()
	defer s.Unlock()

	s.TotalMessages++
	
	// Count by source node
	s.ByNode[packet.From]++
	
	// Count by port type
	s.ByPortType[packet.PortNum]++
}

// PrintStats prints current statistics
func (s *MessageStats) PrintStats() {
	s.Lock()
	defer s.Unlock()

	now := time.Now()
	duration := now.Sub(s.LastStatsPrinted)
	msgPerSec := float64(s.TotalMessages) / duration.Seconds()
	
	fmt.Println("\n==== Message Statistics ====")
	fmt.Printf("Total messages: %d (%.2f msg/sec)\n", s.TotalMessages, msgPerSec)
	
	// Print node statistics
	fmt.Println("\nMessages by Node:")
	for nodeID, count := range s.ByNode {
		fmt.Printf("  Node %d: %d messages\n", nodeID, count)
	}
	
	// Print port type statistics
	fmt.Println("\nMessages by Port Type:")
	for portType, count := range s.ByPortType {
		fmt.Printf("  %s: %d messages\n", portType, count)
	}
	fmt.Println(strings.Repeat("=", 30))
	
	// Reset counters for rate calculation
	s.TotalMessages = 0
	s.ByNode = make(map[uint32]int)
	s.ByPortType = make(map[pb.PortNum]int)
	s.LastStatsPrinted = now
}

// Close stops the stats collector and unsubscribes from the broker
func (s *MessageStats) Close() {
	// Signal the collection loop to stop
	close(s.done)
	
	// Unsubscribe from the broker
	s.broker.Unsubscribe(s.subscriber)
	
	// Wait for the collection loop to exit
	s.wg.Wait()
}