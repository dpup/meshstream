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

// MessageLogger logs messages to files and optionally to stdout
type MessageLogger struct {
	*BaseSubscriber
	logDir          string
	loggers         map[pb.PortNum]*log.Logger
	files           map[pb.PortNum]*os.File
	mutex           sync.Mutex
	logToStdout     bool  // Flag to enable console output
	stdoutSeparator string // Separator for console output
}

// NewMessageLogger creates a new message logger that subscribes to the broker
func NewMessageLogger(broker *Broker, logDir string, logToStdout bool, stdoutSeparator string) (*MessageLogger, error) {
	// Ensure log directory exists
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %v", err)
	}
	
	ml := &MessageLogger{
		logDir:          logDir,
		loggers:         make(map[pb.PortNum]*log.Logger),
		files:           make(map[pb.PortNum]*os.File),
		logToStdout:     logToStdout,
		stdoutSeparator: stdoutSeparator,
	}
	
	// Create base subscriber with logger's message handler
	ml.BaseSubscriber = NewBaseSubscriber(SubscriberConfig{
		Name:       "MessageLogger",
		Broker:     broker,
		BufferSize: 100,
		Processor:  ml.logMessage,
		CloseHook:  ml.closeLogFiles,
	})
	
	// Start processing messages
	ml.Start()
	
	return ml, nil
}

// closeLogFiles is called when the subscriber is closed
func (ml *MessageLogger) closeLogFiles() {
	ml.mutex.Lock()
	defer ml.mutex.Unlock()
	
	for portNum, file := range ml.files {
		log.Printf("Closing log file for %s", portNum)
		file.Close()
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

// logMessage logs a message to the appropriate file and optionally to stdout
func (ml *MessageLogger) logMessage(packet *Packet) {
	// Format the message
	formattedOutput := decoder.FormatTopicAndPacket(packet.TopicInfo, packet.DecodedPacket)
	
	// Add a timestamp and node info
	logEntry := fmt.Sprintf("[Node %d] %s\n%s",
		packet.From,
		time.Now().Format(time.RFC3339),
		formattedOutput)
	
	// Log to file
	logger := ml.getLogger(packet.PortNum)
	if logger != nil {
		logger.Println(logEntry)
	}
	
	// Log to stdout if enabled
	if ml.logToStdout {
		fmt.Println(formattedOutput)
		if ml.stdoutSeparator != "" {
			fmt.Println(ml.stdoutSeparator)
		}
	}
}

