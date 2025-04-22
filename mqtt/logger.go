package mqtt

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/dpup/prefab/logging"
	"google.golang.org/protobuf/encoding/protojson"

	meshtreampb "meshstream/generated/meshstream"
	pb "meshstream/generated/meshtastic"
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
func (ml *MessageLogger) getBriefSummary(packet *meshtreampb.Packet) string {
	var summary string

	if packet.Data.DecodeError != "" {
		return fmt.Sprintf("Error decoding packet: %v", packet.Data.DecodeError)
	}

	// Create a basic summary based on the port type
	switch packet.Data.PortNum {
	case pb.PortNum_TEXT_MESSAGE_APP:
		// For text messages, include the text content
		if packet.Data.GetTextMessage() != "" {
			summary = fmt.Sprintf("Text message: %s", packet.Data.GetTextMessage())
		} else {
			summary = "Text message (invalid format)"
		}

	case pb.PortNum_POSITION_APP:
		// For position messages, include a compact location summary
		if pos := packet.Data.GetPosition(); pos != nil {
			lat := float64(pos.GetLatitudeI()) / 10000000.0
			lon := float64(pos.GetLongitudeI()) / 10000000.0
			summary = fmt.Sprintf("Position: %.5f, %.5f", lat, lon)
		} else {
			summary = "Position update (invalid format)"
		}

	case pb.PortNum_TELEMETRY_APP:
		// For telemetry, give a short summary of what's included
		if telemetry := packet.Data.GetTelemetry(); telemetry != nil {
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
		summary = fmt.Sprintf("Message type: %s", packet.Data.PortNum.String())
	}

	return summary
}

// logMessage logs a message using the structured logger
func (ml *MessageLogger) logMessage(packet *meshtreampb.Packet) {
	// Get a brief summary for structured logging
	briefSummary := ml.getBriefSummary(packet)

	// Build the message prefix with type and GatewayID info for brief mode
	typePrefix := fmt.Sprintf("[%s]", packet.Data.PortNum.String())
	if packet.Data.GatewayId != "" {
		briefSummary = fmt.Sprintf("%s Gateway:%s %s", typePrefix, packet.Data.GatewayId, briefSummary)
	} else {
		briefSummary = fmt.Sprintf("%s %s", typePrefix, briefSummary)
	}

	if ml.briefMode {
		fields := []interface{}{
			"portNum", packet.Data.PortNum.String(),
			"from", packet.Data.From,
			"to", packet.Data.To,
			"gateway", packet.Data.GatewayId,
			"channel", packet.Info.Channel,
			"region", packet.Info.RegionPath,
			"hopLimit", packet.Data.HopLimit,
			"id", packet.Data.Id,
		}
		if packet.Data.DecodeError != "" {
			fields = append(fields, "error", packet.Data.DecodeError)
		}
		ml.logger.Infow(briefSummary, fields...)
	} else {
		// Convert the protobuf message to a structured map for logging
		// Use protojson to properly handle all fields and nested messages
		marshaler := protojson.MarshalOptions{
			EmitUnpopulated: false,
			UseProtoNames:   false, // Use camelCase names for consistency with other logging
		}

		// Marshal the packet to JSON
		packetJSON, err := marshaler.Marshal(packet)
		if err != nil {
			ml.logger.Warnw("Failed to marshal packet to JSON", "error", err)
			ml.logger.Infow(briefSummary, "packet", packet)
			return
		}

		// Unmarshal back to a map for structured logging
		var packetMap map[string]interface{}
		err = json.Unmarshal(packetJSON, &packetMap)
		if err != nil {
			ml.logger.Warnw("Failed to unmarshal packet JSON to map", "error", err)
			ml.logger.Infow(briefSummary, "packet", packet)
			return
		}

		// Log with the structured map
		ml.logger.Infow(briefSummary, "packet", packetMap)
	}
}
