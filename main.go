package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"meshstream/decoder"
	"meshstream/mqtt"

	pb "meshstream/proto/generated/meshtastic"
)

const (
	mqttBroker      = "mqtt.bayme.sh"
	mqttUsername    = "meshdev"
	mqttPassword    = "large4cats"
	mqttTopicPrefix = "msh/US/bayarea"
	logsDir         = "./logs"
)

// MessageStats tracks statistics about received messages
type MessageStats struct {
	sync.Mutex
	TotalMessages    int
	ByNode           map[uint32]int
	ByPortType       map[pb.PortNum]int
	LastStatsPrinted time.Time
}

// NewMessageStats creates a new MessageStats instance
func NewMessageStats() *MessageStats {
	return &MessageStats{
		ByNode:           make(map[uint32]int),
		ByPortType:       make(map[pb.PortNum]int),
		LastStatsPrinted: time.Now(),
	}
}

// RecordMessage records a message in the statistics
func (s *MessageStats) RecordMessage(packet *mqtt.Packet) {
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

// MessageLogger logs messages of specific types to separate files
type MessageLogger struct {
	logDir     string
	loggers    map[pb.PortNum]*log.Logger
	files      map[pb.PortNum]*os.File
	mutex      sync.Mutex
}

// NewMessageLogger creates a new message logger
func NewMessageLogger(logDir string) (*MessageLogger, error) {
	// Ensure log directory exists
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %v", err)
	}
	
	return &MessageLogger{
		logDir:  logDir,
		loggers: make(map[pb.PortNum]*log.Logger),
		files:   make(map[pb.PortNum]*os.File),
	}, nil
}

// getLogger returns a logger for the specified port type
func (ml *MessageLogger) getLogger(portNum pb.PortNum) *log.Logger {
	ml.mutex.Lock()
	defer ml.mutex.Unlock()
	
	// Check if we already have a logger for this port type
	if logger, ok := ml.loggers[portNum]; ok {
		return logger
	}
	
	// Create a new log file for this port type
	filename := fmt.Sprintf("%s.log", strings.ToLower(portNum.String()))
	filepath := filepath.Join(ml.logDir, filename)
	
	file, err := os.OpenFile(filepath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		log.Printf("Error opening log file %s: %v", filepath, err)
		return nil
	}
	
	// Create a new logger
	logger := log.New(file, "", log.LstdFlags)
	
	// Store the logger and file handle
	ml.loggers[portNum] = logger
	ml.files[portNum] = file
	
	return logger
}

// LogMessage logs a message to the appropriate file based on its port type
func (ml *MessageLogger) LogMessage(packet *mqtt.Packet) {
	// We only log specific message types
	switch packet.PortNum {
	case pb.PortNum_POSITION_APP,
	     pb.PortNum_TELEMETRY_APP,
	     pb.PortNum_NODEINFO_APP,
	     pb.PortNum_MAP_REPORT_APP,
	     pb.PortNum_TRACEROUTE_APP,
	     pb.PortNum_NEIGHBORINFO_APP:
		
		// Get the logger for this port type
		logger := ml.getLogger(packet.PortNum)
		if logger != nil {
			// Format the message
			formattedOutput := decoder.FormatTopicAndPacket(packet.TopicInfo, packet.DecodedPacket)
			
			// Add a timestamp and node info
			logEntry := fmt.Sprintf("[Node %d] %s\n%s\n",
				packet.From,
				time.Now().Format(time.RFC3339),
				formattedOutput)
			
			// Write to the log
			logger.Println(logEntry)
		}
	}
}

// Close closes all log files
func (ml *MessageLogger) Close() {
	ml.mutex.Lock()
	defer ml.mutex.Unlock()
	
	for portNum, file := range ml.files {
		log.Printf("Closing log file for %s", portNum)
		file.Close()
	}
}

func main() {
	// Set up logging
	log.SetOutput(os.Stdout)

	// Initialize default channel key
	err := decoder.AddChannelKey("LongFast", decoder.DefaultPrivateKey)
	if err != nil {
		log.Printf("Failed to initialize default channel key: %v", err)
	}

	if err := decoder.AddChannelKey("ERSN", "VIuMtC5uDDJtC/ojdH314HLkDIHanX4LdbK5yViV9jA="); err != nil {
		log.Printf("Failed to initialize ERSN channel key: %v", err)
	}

	// Configure and create the MQTT client
	mqttConfig := mqtt.Config{
		Broker:   mqttBroker,
		Username: mqttUsername,
		Password: mqttPassword,
		ClientID: "meshstream-client",
		Topic:    mqttTopicPrefix + "/#",
	}
	
	mqttClient := mqtt.NewClient(mqttConfig)
	
	// Connect to the MQTT broker
	if err := mqttClient.Connect(); err != nil {
		log.Fatalf("Failed to connect to MQTT broker: %v", err)
	}
	
	// Get the messages channel to receive decoded messages
	messagesChan := mqttClient.Messages()
	
	// Create a message broker to distribute messages to multiple consumers
	broker := mqtt.NewBroker(messagesChan)
	
	// Create a consumer channel for display with buffer size 10
	displayChan := broker.Subscribe(10)
	
	// Create a consumer channel for statistics with buffer size 50
	statsChan := broker.Subscribe(50)
	
	// Create a consumer channel for logging with buffer size 100
	loggerChan := broker.Subscribe(100)
	
	// Create a stats tracker
	stats := NewMessageStats()
	
	// Create a message logger
	messageLogger, err := NewMessageLogger(logsDir)
	if err != nil {
		log.Printf("Warning: Failed to initialize message logger: %v", err)
	}
	
	// Create a ticker for periodically printing stats
	statsTicker := time.NewTicker(30 * time.Second)
	
	// Setup signal handling for graceful shutdown
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	
	// Start a goroutine for processing statistics
	go func() {
		for {
			select {
			case packet, ok := <-statsChan:
				if !ok {
					// Channel closed
					return
				}
				
				if packet != nil {
					stats.RecordMessage(packet)
				}
				
			case <-statsTicker.C:
				stats.PrintStats()
			}
		}
	}()
	
	// Start a goroutine for logging specific message types
	go func() {
		if messageLogger != nil {
			for {
				packet, ok := <-loggerChan
				if !ok {
					// Channel closed
					return
				}
				
				if packet != nil {
					messageLogger.LogMessage(packet)
				}
			}
		}
	}()
	
	// Process messages until interrupt received
	fmt.Println("Waiting for messages... Press Ctrl+C to exit")
	fmt.Println("Statistics will be printed every 30 seconds")
	fmt.Println("Specific message types will be logged to files in the ./logs directory")
	
	// Main event loop for display
	for {
		select {
		case packet := <-displayChan:
			if packet == nil {
				log.Println("Received nil packet, subscriber channel may be closed")
				continue
			}
			
			// Format and print the decoded message
			formattedOutput := decoder.FormatTopicAndPacket(packet.TopicInfo, packet.DecodedPacket)
			fmt.Println(formattedOutput)
			fmt.Println(strings.Repeat("-", 80))
			
		case <-sig:
			// Got an interrupt signal, shutting down
			fmt.Println("Shutting down...")
			// Stop the ticker
			statsTicker.Stop()
			// Close the message logger
			if messageLogger != nil {
				messageLogger.Close()
			}
			// Close the broker first (which will close all subscriber channels)
			broker.Close()
			// Then disconnect the MQTT client
			mqttClient.Disconnect()
			return
		}
	}
}