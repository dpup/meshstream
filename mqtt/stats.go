package mqtt

import (
	"fmt"
	"sync"
	"time"

	"github.com/dpup/prefab/logging"

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
	logger           logging.Logger
}

// NewMessageStats creates a new MessageStats instance
func NewMessageStats(broker *Broker, printInterval time.Duration, logger logging.Logger) *MessageStats {
	statsLogger := logger.Named("mqtt.MessageStats")

	s := &MessageStats{
		ByNode:           make(map[uint32]int),
		ByPortType:       make(map[pb.PortNum]int),
		LastStatsPrinted: time.Now(),
		ticker:           time.NewTicker(printInterval),
		logger:           statsLogger,
	}

	// Create base subscriber with stats message handler
	s.BaseSubscriber = NewBaseSubscriber(SubscriberConfig{
		Name:       "MessageStats",
		Broker:     broker,
		BufferSize: 50,
		Processor:  s.recordMessage,
		StartHook:  func() { go s.runTicker() },
		CloseHook:  func() { s.ticker.Stop() },
		Logger:     statsLogger,
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

// PrintStats logs current statistics using the structured logger
func (s *MessageStats) PrintStats() {
	s.Lock()
	defer s.Unlock()

	now := time.Now()
	duration := now.Sub(s.LastStatsPrinted)
	msgPerSec := float64(s.TotalMessages) / duration.Seconds()

	// Log the basic statistics with structured fields
	s.logger.Infow("Message Statistics Summary",
		"total_messages", s.TotalMessages,
		"messages_per_second", msgPerSec,
		"duration_seconds", duration.Seconds(),
	)

	// Create maps for structured node and port stats
	nodeStats := make(map[string]int)
	for nodeID, count := range s.ByNode {
		nodeStats[fmt.Sprintf("node_%d", nodeID)] = count
	}

	// Log node statistics with structured fields
	s.logger.Infow("Messages by Node",
		"node_counts", nodeStats,
		"active_nodes", len(s.ByNode),
	)

	// Create maps for structured port stats
	portStats := make(map[string]int)
	for portType, count := range s.ByPortType {
		portStats[portType.String()] = count
	}

	// Log port type statistics with structured fields
	s.logger.Infow("Messages by Port Type",
		"port_counts", portStats,
		"active_ports", len(s.ByPortType),
	)

	// Reset counters for rate calculation
	s.TotalMessages = 0
	s.ByNode = make(map[uint32]int)
	s.ByPortType = make(map[pb.PortNum]int)
	s.LastStatsPrinted = now
}
