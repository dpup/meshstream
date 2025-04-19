package decoder

import (
	"encoding/json"
	"fmt"
	"strings"
	
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/encoding/protojson"
	
	pb "meshstream/proto/generated/meshtastic"
)

// TopicInfo contains parsed information about a Meshtastic MQTT topic
type TopicInfo struct {
	FullTopic   string
	RegionPath  string
	Version     string
	Format      string
	Channel     string
	UserID      string
}

// ParseTopic parses a Meshtastic MQTT topic into its components
func ParseTopic(topic string) (*TopicInfo, error) {
	info := &TopicInfo{
		FullTopic: topic,
	}

	// Format: msh/REGION_PATH/VERSION/FORMAT/CHANNELNAME/USERID
	// Example: msh/US/CA/Motherlode/2/e/LongFast/!abcd1234
	// Example: msh/US/CA/Motherlode/2/json/LongFast/!abcd1234
	parts := strings.Split(topic, "/")
	if len(parts) < 4 {
		return info, fmt.Errorf("invalid topic format: %s", topic)
	}

	// Find protocol version and format indices by looking for "2" followed by "e" or "json"
	versionIndex := -1
	formatIndex := -1
	
	for i := 1; i < len(parts)-1; i++ {
		if parts[i] == "2" {
			// Found the version
			versionIndex = i
			formatIndex = i + 1
			break
		}
	}
	
	if versionIndex == -1 || formatIndex >= len(parts) {
		// Could not find proper version/format markers
		return info, fmt.Errorf("invalid topic format, missing version/format: %s", topic)
	}
	
	// Extract region path (all segments between "msh" and version)
	if versionIndex > 1 {
		info.RegionPath = strings.Join(parts[1:versionIndex], "/")
	}
	
	// Extract version and format
	info.Version = parts[versionIndex]
	info.Format = parts[formatIndex]
	
	// Extract channel and user ID
	channelIndex := formatIndex + 1
	userIdIndex := channelIndex + 1
	
	if channelIndex < len(parts) {
		info.Channel = parts[channelIndex]
	}
	
	if userIdIndex < len(parts) {
		info.UserID = parts[userIdIndex]
	}
	
	return info, nil
}

// DecodeEncodedMessage decodes a binary encoded message (format "e")
func DecodeEncodedMessage(payload []byte) (*pb.ServiceEnvelope, error) {
	var serviceEnvelope pb.ServiceEnvelope
	if err := proto.Unmarshal(payload, &serviceEnvelope); err != nil {
		return nil, fmt.Errorf("failed to unmarshal ServiceEnvelope: %v", err)
	}
	return &serviceEnvelope, nil
}

// DecodeJSONMessage decodes a JSON message (format "json")
func DecodeJSONMessage(payload []byte) (map[string]interface{}, error) {
	var jsonData map[string]interface{}
	if err := json.Unmarshal(payload, &jsonData); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %v", err)
	}
	return jsonData, nil
}

// FormatServiceEnvelope formats a ServiceEnvelope message into a human-readable string
func FormatServiceEnvelope(envelope *pb.ServiceEnvelope) string {
	var builder strings.Builder
	
	builder.WriteString("ServiceEnvelope:\n")
	
	// Print basic envelope info
	builder.WriteString(fmt.Sprintf("  Channel ID: %s\n", envelope.GetChannelId()))
	builder.WriteString(fmt.Sprintf("  Gateway ID: %s\n", envelope.GetGatewayId()))
	
	// Print MeshPacket info if available
	if packet := envelope.GetPacket(); packet != nil {
		builder.WriteString("\nMeshPacket:\n")
		builder.WriteString(fmt.Sprintf("  ID: %d\n", packet.GetId()))
		builder.WriteString(fmt.Sprintf("  From: %d\n", packet.GetFrom()))
		builder.WriteString(fmt.Sprintf("  To: %d\n", packet.GetTo()))
		
		// Output routing and hop information
		builder.WriteString(fmt.Sprintf("  Hop Limit: %d\n", packet.GetHopLimit()))
		builder.WriteString(fmt.Sprintf("  Hop Start: %d\n", packet.GetHopStart()))
		builder.WriteString(fmt.Sprintf("  Want ACK: %v\n", packet.GetWantAck()))
		builder.WriteString(fmt.Sprintf("  Priority: %s\n", packet.GetPriority()))
		
		// Output if the packet was delivered via MQTT
		if packet.GetViaMqtt() {
			builder.WriteString("  Via MQTT: Yes\n")
		}
		
		// Relay and next hop info
		if packet.GetNextHop() != 0 {
			builder.WriteString(fmt.Sprintf("  Next Hop: %d\n", packet.GetNextHop()))
		}
		if packet.GetRelayNode() != 0 {
			builder.WriteString(fmt.Sprintf("  Relay Node: %d\n", packet.GetRelayNode()))
		}
		
		// Show public key information if available (for PKI-encrypted packets)
		if len(packet.GetPublicKey()) > 0 {
			builder.WriteString(fmt.Sprintf("  Public Key: %x\n", packet.GetPublicKey()))
			builder.WriteString(fmt.Sprintf("  PKI Encrypted: %v\n", packet.GetPkiEncrypted()))
		}
		
		// Determine payload type
		if packet.GetDecoded() != nil {
			data := packet.GetDecoded()
			builder.WriteString(fmt.Sprintf("\n  Decoded Data (Port: %s):\n", data.GetPortnum()))
			
			// Output portnum-specific information
			switch data.GetPortnum() {
			case pb.PortNum_TEXT_MESSAGE_APP:
				// Text message
				builder.WriteString(fmt.Sprintf("    Text Message: %s\n", string(data.GetPayload())))
			case pb.PortNum_TELEMETRY_APP:
				// Try to decode telemetry data
				builder.WriteString("    Telemetry Data\n")
				builder.WriteString(fmt.Sprintf("    Payload (%d bytes): %x\n", len(data.GetPayload()), data.GetPayload()))
			case pb.PortNum_NODEINFO_APP:
				// Node information
				builder.WriteString("    Node Information\n")
				builder.WriteString(fmt.Sprintf("    Payload (%d bytes): %x\n", len(data.GetPayload()), data.GetPayload()))
			case pb.PortNum_POSITION_APP:
				// Position data
				builder.WriteString("    Position Data\n")
				builder.WriteString(fmt.Sprintf("    Payload (%d bytes): %x\n", len(data.GetPayload()), data.GetPayload()))
			default:
				// For other message types, print the payload as hex
				builder.WriteString(fmt.Sprintf("    Payload (%d bytes): %x\n", len(data.GetPayload()), data.GetPayload()))
			}
			
			// Show additional Data fields
			if data.GetRequestId() != 0 {
				builder.WriteString(fmt.Sprintf("    Request ID: %d\n", data.GetRequestId()))
			}
			if data.GetReplyId() != 0 {
				builder.WriteString(fmt.Sprintf("    Reply ID: %d\n", data.GetReplyId()))
			}
			if data.GetEmoji() != 0 {
				builder.WriteString(fmt.Sprintf("    Emoji: %d\n", data.GetEmoji()))
			}
			if data.GetDest() != 0 {
				builder.WriteString(fmt.Sprintf("    Destination Node: %d\n", data.GetDest()))
			}
			if data.GetSource() != 0 {
				builder.WriteString(fmt.Sprintf("    Source Node: %d\n", data.GetSource()))
			}
			if data.GetWantResponse() {
				builder.WriteString("    Wants Response: Yes\n")
			}
			
		} else if packet.GetEncrypted() != nil {
			// Encrypted payload information
			builder.WriteString("\n  Encrypted Payload:\n")
			builder.WriteString(fmt.Sprintf("    Size: %d bytes\n", len(packet.GetEncrypted())))
			builder.WriteString(fmt.Sprintf("    Channel: %d\n", packet.GetChannel()))
			
			// Print the first few bytes of the encrypted payload for identification
			if len(packet.GetEncrypted()) > 0 {
				displayLen := len(packet.GetEncrypted())
				if displayLen > 16 {
					displayLen = 16
				}
				builder.WriteString(fmt.Sprintf("    First %d bytes: %x\n", displayLen, packet.GetEncrypted()[:displayLen]))
			}
			
			// If the packet has both channel and encrypted payload, it's using channel-based encryption
			if packet.GetChannel() != 0 {
				builder.WriteString("    Encryption: Channel-based\n")
			}
		}
	}
	
	// Use protojson to generate a full JSON representation for debugging
	marshaler := protojson.MarshalOptions{
		Multiline: true,
		Indent:    "  ",
	}
	jsonBytes, err := marshaler.Marshal(envelope)
	if err == nil {
		builder.WriteString("\nFull Protobuf Structure:\n")
		builder.WriteString(string(jsonBytes))
	}
	
	return builder.String()
}

// FormatJSONMessage formats a JSON message into a human-readable string
func FormatJSONMessage(jsonData map[string]interface{}) string {
	var builder strings.Builder
	
	builder.WriteString("JSON Message:\n")
	
	// Extract and display common fields
	if from, ok := jsonData["from"].(string); ok {
		builder.WriteString(fmt.Sprintf("  From: %s\n", from))
	}
	if to, ok := jsonData["to"].(string); ok {
		builder.WriteString(fmt.Sprintf("  To: %s\n", to))
	}
	if message, ok := jsonData["payload"].(string); ok {
		builder.WriteString(fmt.Sprintf("  Message: %s\n", message))
	}
	if timestamp, ok := jsonData["timestamp"].(string); ok {
		builder.WriteString(fmt.Sprintf("  Timestamp: %s\n", timestamp))
	}
	
	// Format the full JSON for reference
	jsonBytes, err := json.MarshalIndent(jsonData, "  ", "  ")
	if err == nil {
		builder.WriteString("\nFull JSON Structure:\n  ")
		builder.WriteString(string(jsonBytes))
	}
	
	return builder.String()
}

// FormatMessage formats a decoded message based on its format
func FormatMessage(topicInfo *TopicInfo, payload []byte) string {
	var builder strings.Builder
	
	// Display topic information
	builder.WriteString(fmt.Sprintf("Topic: %s\n", topicInfo.FullTopic))
	builder.WriteString(fmt.Sprintf("Region Path: %s\n", topicInfo.RegionPath))
	builder.WriteString(fmt.Sprintf("Version: %s\n", topicInfo.Version))
	builder.WriteString(fmt.Sprintf("Format: %s\n", topicInfo.Format))
	builder.WriteString(fmt.Sprintf("Channel: %s\n", topicInfo.Channel))
	if topicInfo.UserID != "" {
		builder.WriteString(fmt.Sprintf("User ID: %s\n", topicInfo.UserID))
	}
	builder.WriteString("\n")
	
	// Decode and format based on the format
	if topicInfo.Format == "e" {
		// Encoded protobuf message (ServiceEnvelope)
		serviceEnvelope, err := DecodeEncodedMessage(payload)
		if err != nil {
			builder.WriteString(fmt.Sprintf("Error decoding encoded message: %v\n", err))
			builder.WriteString(fmt.Sprintf("Raw Binary (%d bytes): %x\n", len(payload), payload))
		} else {
			builder.WriteString(FormatServiceEnvelope(serviceEnvelope))
		}
	} else if topicInfo.Format == "json" {
		// JSON message
		jsonData, err := DecodeJSONMessage(payload)
		if err != nil {
			builder.WriteString(fmt.Sprintf("Error decoding JSON message: %v\n", err))
			builder.WriteString(fmt.Sprintf("Raw Data: %s\n", string(payload)))
		} else {
			builder.WriteString(FormatJSONMessage(jsonData))
		}
	} else {
		// Unknown format
		builder.WriteString(fmt.Sprintf("Unsupported format: %s\n", topicInfo.Format))
		builder.WriteString(fmt.Sprintf("Raw Data (%d bytes): %x\n", len(payload), payload))
	}
	
	return builder.String()
}