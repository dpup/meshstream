package mqtt

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"meshstream/decoder"

	pb "meshstream/proto/generated/meshtastic"
)

// MessageLogger logs messages of specific types to separate files
type MessageLogger struct {
	logDir      string
	broker      *Broker
	subscriber  <-chan *Packet
	loggers     map[pb.PortNum]*log.Logger
	files       map[pb.PortNum]*os.File
	mutex       sync.Mutex
	done        chan struct{}
	wg          sync.WaitGroup
}

// NewMessageLogger creates a new message logger that subscribes to the broker
func NewMessageLogger(broker *Broker, logDir string) (*MessageLogger, error) {
	// Ensure log directory exists
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %v", err)
	}
	
	ml := &MessageLogger{
		logDir:  logDir,
		broker:  broker,
		loggers: make(map[pb.PortNum]*log.Logger),
		files:   make(map[pb.PortNum]*os.File),
		done:    make(chan struct{}),
	}
	
	// Subscribe to the broker with a large buffer
	ml.subscriber = broker.Subscribe(100)
	
	// Start processing messages
	ml.wg.Add(1)
	go ml.run()
	
	return ml, nil
}

// run processes incoming messages
func (ml *MessageLogger) run() {
	defer ml.wg.Done()
	
	for {
		select {
		case packet, ok := <-ml.subscriber:
			if !ok {
				// Channel closed
				return
			}
			
			if packet != nil {
				ml.logMessage(packet)
			}
			
		case <-ml.done:
			return
		}
	}
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

// logMessage logs a message to the appropriate file based on its port type
func (ml *MessageLogger) logMessage(packet *Packet) {
	// Log all message types by getting a logger for the packet's port type
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

// Close stops the logger and closes all log files
func (ml *MessageLogger) Close() {
	// Signal the processing loop to stop
	close(ml.done)
	
	// Unsubscribe from the broker
	ml.broker.Unsubscribe(ml.subscriber)
	
	// Wait for the processing loop to exit
	ml.wg.Wait()
	
	// Close all log files
	ml.mutex.Lock()
	defer ml.mutex.Unlock()
	
	for portNum, file := range ml.files {
		log.Printf("Closing log file for %s", portNum)
		file.Close()
	}
}