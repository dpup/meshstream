package mqtt

import (
	"fmt"
	"strings"

	"github.com/dpup/prefab/logging"

	pb "meshstream/proto/generated/meshtastic"
)

// MessageLogger logs messages using the provided logger
type MessageLogger struct {
	*BaseSubscriber
	logger    logging.Logger // Main logger instance
	briefMode bool           // Whether to log brief summaries instead of full packets
}

// NewMessageLogger creates a new message logger that subscribes to the broker
func NewMessageLogger(broker *Broker, briefMode bool, logger logging.Logger) (*MessageLogger, error) {
	messageLoggerLogger := logger.Named("mqtt.MessageLogger")

	ml := &MessageLogger{
		briefMode: briefMode,
		logger:    messageLoggerLogger,
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
	// Get a brief summary for structured logging
	briefSummary := ml.getBriefSummary(packet)

	// Build the message prefix with type and GatewayID info for brief mode
	typePrefix := fmt.Sprintf("[%s]", packet.PortNum.String())
	if packet.GatewayID != "" {
		briefSummary = fmt.Sprintf("%s Gateway:%s %s", typePrefix, packet.GatewayID, briefSummary)
	} else {
		briefSummary = fmt.Sprintf("%s %s", typePrefix, briefSummary)
	}

	if ml.briefMode {
		fields := []interface{}{
			"portNum", packet.PortNum.String(),
			"from", packet.From,
			"to", packet.To,
			"gateway", packet.GatewayID,
			"channel", packet.TopicInfo.Channel,
			"region", packet.TopicInfo.RegionPath,
			"hopLimit", packet.HopLimit,
			"id", packet.ID,
		}
		if packet.DecodedPacket.DecodeError != nil {
			fields = append(fields, "error", packet.DecodedPacket.DecodeError.Error())
		}
		ml.logger.Infow(briefSummary, fields...)
	} else {
		ml.logger.Infow(briefSummary, "packet", packet)
	}

}
