package mqtt

import (
	"fmt"
	"strings"

	"github.com/dpup/prefab/logging"

	"meshstream/decoder"

	pb "meshstream/proto/generated/meshtastic"
)

// MessageLogger logs messages using the provided logger
type MessageLogger struct {
	*BaseSubscriber
	logger           logging.Logger // Main logger instance
	briefMode        bool           // Whether to log brief summaries instead of full packets
	logToStdout      bool           // Flag to enable console output
	stdoutSeparator  string         // Separator for console output
}

// NewMessageLogger creates a new message logger that subscribes to the broker
func NewMessageLogger(broker *Broker, briefMode bool, logToStdout bool, stdoutSeparator string, logger logging.Logger) (*MessageLogger, error) {
	// Use provided logger or create a default one
	if logger == nil {
		logger = logging.NewDevLogger()
	}
	messageLoggerLogger := logger.Named("mqtt.message_logger")
	
	ml := &MessageLogger{
		briefMode:        briefMode,
		logToStdout:      logToStdout,
		stdoutSeparator:  stdoutSeparator,
		logger:           messageLoggerLogger,
	}
	
	// Create base subscriber with logger's message handler
	ml.BaseSubscriber = NewBaseSubscriber(SubscriberConfig{
		Name:       "MessageLogger",
		Broker:     broker,
		BufferSize: 100,
		Processor:  ml.logMessage,
		Logger:     logger,
	})
	
	// Start processing messages
	ml.Start()
	
	return ml, nil
}

// getBriefSummary returns a brief summary of the packet
func (ml *MessageLogger) getBriefSummary(packet *Packet) string {
	var summary string
	
	if packet.DecodedPacket.DecodeError != nil {
		return fmt.Sprintf("Error decoding packet: %v", packet.DecodedPacket.DecodeError)
	}
	
	// Create a basic summary based on the port type
	switch packet.PortNum {
	case pb.PortNum_TEXT_MESSAGE_APP:
		// For text messages, include the text content
		if text, ok := packet.Payload.(string); ok {
			summary = fmt.Sprintf("Text message: %s", text)
		} else {
			summary = "Text message (invalid format)"
		}
		
	case pb.PortNum_POSITION_APP:
		// For position messages, include a compact location summary
		if pos, ok := packet.Payload.(*pb.Position); ok {
			lat := float64(pos.GetLatitudeI()) / 10000000.0
			lon := float64(pos.GetLongitudeI()) / 10000000.0
			summary = fmt.Sprintf("Position: %.5f, %.5f", lat, lon)
		} else {
			summary = "Position update (invalid format)"
		}
		
	case pb.PortNum_TELEMETRY_APP:
		// For telemetry, give a short summary of what's included
		if telemetry, ok := packet.Payload.(*pb.Telemetry); ok {
			parts := []string{}
			if telemetry.GetEnvironmentMetrics() != nil {
				parts = append(parts, "environment")
			}
			if telemetry.GetDeviceMetrics() != nil {
				parts = append(parts, "device")
			}
			if telemetry.GetPowerMetrics() != nil {
				parts = append(parts, "power")
			}
			summary = fmt.Sprintf("Telemetry: %s", strings.Join(parts, ", "))
		} else {
			summary = "Telemetry (invalid format)"
		}
		
	default:
		// For other types, just mention the port type
		summary = fmt.Sprintf("Message type: %s", packet.PortNum.String())
	}
	
	return summary
}

// logMessage logs a message using the structured logger
func (ml *MessageLogger) logMessage(packet *Packet) {
	// Get the full formatted output if needed for stdout or debug logging
	formattedOutput := decoder.FormatTopicAndPacket(packet.TopicInfo, packet.DecodedPacket)
	
	// Get a brief summary for structured logging
	briefSummary := ml.getBriefSummary(packet)
	
	// Prepare common fields for both logging modes
	fields := []interface{}{
		"portNum", packet.PortNum.String(),
		"from", packet.From,
		"to", packet.To,
		"channel", packet.TopicInfo.Channel,
		"region", packet.TopicInfo.RegionPath,
	}
	
	// If packet had a decode error, add it to the fields
	if packet.DecodedPacket.DecodeError != nil {
		fields = append(fields, "error", packet.DecodedPacket.DecodeError.Error())
	}
	
	// Log based on mode
	if ml.briefMode {
		// Brief mode - just log the summary with structured fields
		ml.logger.Infow(briefSummary, fields...)
	} else {
		// Full mode - include the full formatted output
		allFields := append(fields, "fullOutput", formattedOutput)
		ml.logger.Infow("Message received", allFields...)
	}
	
	// Log to stdout if enabled
	if ml.logToStdout {
		fmt.Println(formattedOutput)
		if ml.stdoutSeparator != "" {
			fmt.Println(ml.stdoutSeparator)
		}
	}
}

