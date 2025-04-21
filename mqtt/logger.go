package mqtt

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/dpup/prefab/logging"

	"meshstream/decoder"

	pb "meshstream/proto/generated/meshtastic"
)

// MessageLogger logs messages to files and optionally to stdout
type MessageLogger struct {
	*BaseSubscriber
	logDir          string
	loggers         map[pb.PortNum]io.Writer
	files           map[pb.PortNum]*os.File
	mutex           sync.Mutex
	logToStdout     bool  // Flag to enable console output
	stdoutSeparator string // Separator for console output
	logger          logging.Logger // Main logger instance
}

// NewMessageLogger creates a new message logger that subscribes to the broker
func NewMessageLogger(broker *Broker, logDir string, logToStdout bool, stdoutSeparator string) (*MessageLogger, error) {
	// Ensure log directory exists
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %v", err)
	}
	
	// Create a logger with appropriate name
	logger := logging.NewDevLogger().Named("mqtt.message_logger")
	
	ml := &MessageLogger{
		logDir:          logDir,
		loggers:         make(map[pb.PortNum]io.Writer),
		files:           make(map[pb.PortNum]*os.File),
		logToStdout:     logToStdout,
		stdoutSeparator: stdoutSeparator,
		logger:          logger,
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
		ml.logger.Infof("Closing log file for %s", portNum)
		file.Close()
	}
}

// getLogWriter returns a writer for the specified port type
func (ml *MessageLogger) getLogWriter(portNum pb.PortNum) io.Writer {
	ml.mutex.Lock()
	defer ml.mutex.Unlock()
	
	// Check if we already have a writer for this port type
	if writer, ok := ml.loggers[portNum]; ok {
		return writer
	}
	
	// Create a new log file for this port type
	filename := fmt.Sprintf("%s.log", strings.ToLower(portNum.String()))
	filepath := filepath.Join(ml.logDir, filename)
	
	file, err := os.OpenFile(filepath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		ml.logger.Errorw("Error opening log file", "filepath", filepath, "error", err)
		return nil
	}
	
	// Store the writer and file handle
	ml.loggers[portNum] = file
	ml.files[portNum] = file
	
	return file
}

// logMessage logs a message to the appropriate file and optionally to stdout
func (ml *MessageLogger) logMessage(packet *Packet) {
	// Format the message
	formattedOutput := decoder.FormatTopicAndPacket(packet.TopicInfo, packet.DecodedPacket)
	
	// Add a timestamp and node info
	logEntry := fmt.Sprintf("[Node %d] %s\n%s\n",
		packet.From,
		time.Now().Format(time.RFC3339),
		formattedOutput)
	
	// Log to file
	writer := ml.getLogWriter(packet.PortNum)
	if writer != nil {
		fmt.Fprint(writer, logEntry)
	}
	
	// Log to stdout if enabled
	if ml.logToStdout {
		fmt.Println(formattedOutput)
		if ml.stdoutSeparator != "" {
			fmt.Println(ml.stdoutSeparator)
		}
	}
	
	// Also log a brief message with the structured logger
	ml.logger.Debugw("Message logged", 
		"portNum", packet.PortNum.String(), 
		"from", packet.From,
		"to", packet.To,
	)
}

