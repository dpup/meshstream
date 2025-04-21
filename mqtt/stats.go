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
	*BaseSubscriber
	sync.Mutex
	TotalMessages    int
	ByNode           map[uint32]int
	ByPortType       map[pb.PortNum]int
	LastStatsPrinted time.Time
	ticker           *time.Ticker
}

// NewMessageStats creates a new MessageStats instance
func NewMessageStats(broker *Broker, printInterval time.Duration) *MessageStats {
	s := &MessageStats{
		ByNode:           make(map[uint32]int),
		ByPortType:       make(map[pb.PortNum]int),
		LastStatsPrinted: time.Now(),
		ticker:           time.NewTicker(printInterval),
	}
	
	// Create base subscriber with stats message handler
	s.BaseSubscriber = NewBaseSubscriber(SubscriberConfig{
		Name:       "MessageStats",
		Broker:     broker,
		BufferSize: 50,
		Processor:  s.recordMessage,
		StartHook:  func() { go s.runTicker() },
		CloseHook:  func() { s.ticker.Stop() },
	})
	
	// Start processing messages
	s.Start()
	
	return s
}

// runTicker handles the periodic stats printing
func (s *MessageStats) runTicker() {
	for {
		select {
		case <-s.ticker.C:
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

