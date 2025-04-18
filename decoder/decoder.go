package decoder

import (
	"encoding/json"
	"fmt"
	"strings"
	"unicode/utf8"
)

// PacketType represents the type of a Meshtastic packet
type PacketType string

const (
	TypeJSON    PacketType = "json"
	TypeEncoded PacketType = "encoded"
	TypeText    PacketType = "text"
)

// DecodedPacket contains information about a decoded packet
type DecodedPacket struct {
	// Topic structure fields
	Topic       string
	RegionPath  string
	Version     string
	Format      string
	Channel     string
	UserID      string
	Type        PacketType
	
	// JSON message fields
	JSONData    map[string]interface{}
	FromNode    string
	ToNode      string
	Text        string
	Timestamp   string
	
	// Encoded message fields
	ChannelID   string
	GatewayID   string
	PacketID    string
	
	// Raw data
	RawData     []byte
}

// DecodePacket attempts to decode a packet from MQTT
func DecodePacket(topic string, payload []byte) (*DecodedPacket, error) {
	packet := &DecodedPacket{
		Topic:    topic,
		RawData:  payload,
		JSONData: make(map[string]interface{}),
	}

	// Extract topic components
	// Format: msh/REGION_PATH/VERSION/FORMAT/CHANNELNAME/USERID
	// Example: msh/US/CA/Motherlode/2/e/LongFast/!abcd1234
	// Example: msh/US/CA/Motherlode/2/json/LongFast/!abcd1234
	parts := strings.Split(topic, "/")
	if len(parts) < 4 {
		return packet, fmt.Errorf("invalid topic format: %s", topic)
	}

	// Find protocol version and format indices by looking for "2" followed by "e", "c", or "json"
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
		return packet, fmt.Errorf("invalid topic format, missing version/format: %s", topic)
	}
	
	// Extract region path (all segments between "msh" and version)
	if versionIndex > 1 {
		packet.RegionPath = strings.Join(parts[1:versionIndex], "/")
	}
	
	// Extract version and format
	packet.Version = parts[versionIndex]
	packet.Format = parts[formatIndex]
	
	// Process based on format type
	channelIndex := formatIndex + 1
	userIdIndex := channelIndex + 1
	
	if channelIndex < len(parts) {
		packet.Channel = parts[channelIndex]
	}
	
	if userIdIndex < len(parts) {
		packet.UserID = parts[userIdIndex]
	}
	
	// Process based on format type
	if packet.Format == "e" {
		// Encoded protobuf packet (using ServiceEnvelope)
		packet.Type = TypeEncoded
		
		// For encoded packets, try to parse if the payload looks like a JSON ServiceEnvelope
		// (Some gateways present ServiceEnvelope in JSON format)
		if len(payload) > 0 && payload[0] == '{' {
			var serviceEnvelope map[string]interface{}
			if err := json.Unmarshal(payload, &serviceEnvelope); err == nil {
				// Successfully parsed as JSON ServiceEnvelope
				packet.JSONData = serviceEnvelope
				
				// Extract ServiceEnvelope metadata fields
				if channelId, ok := serviceEnvelope["channel_id"].(string); ok {
					packet.ChannelID = channelId
				}
				if gatewayId, ok := serviceEnvelope["gateway_id"].(string); ok {
					packet.GatewayID = gatewayId
				}
				
				// Try to extract data from the packet field
				if packetData, ok := serviceEnvelope["packet"].(map[string]interface{}); ok {
					if id, ok := packetData["id"].(float64); ok {
						packet.PacketID = fmt.Sprintf("%d", int(id))
					}
					if from, ok := packetData["from"].(float64); ok {
						packet.FromNode = fmt.Sprintf("%d", int(from))
					}
					if to, ok := packetData["to"].(float64); ok {
						packet.ToNode = fmt.Sprintf("%d", int(to))
					}
					
					// Try to extract decoded payload if available
					if decoded, ok := packetData["decoded"].(map[string]interface{}); ok {
						if payload, ok := decoded["payload"].(string); ok {
							packet.Text = payload
						}
					}
				}
			}
		}
		
		// Note: For binary protocol buffer decoding we would need to use the generated protobuf code,
		// but we'll defer that for now and just track that this is an encoded packet.
		
	} else if packet.Format == "json" {
		// JSON format
		packet.Type = TypeJSON
		if err := json.Unmarshal(payload, &packet.JSONData); err != nil {
			return packet, fmt.Errorf("failed to parse JSON: %v", err)
		}

		// Extract common fields
		if from, ok := packet.JSONData["from"].(string); ok {
			packet.FromNode = from
		}
		if to, ok := packet.JSONData["to"].(string); ok {
			packet.ToNode = to
		}
		if text, ok := packet.JSONData["payload"].(string); ok {
			packet.Text = text
		}
		if ts, ok := packet.JSONData["timestamp"].(string); ok {
			packet.Timestamp = ts
		}
	} else {
		// Unknown format, try to infer from content
		if len(payload) > 0 && payload[0] == '{' {
			// Looks like JSON
			packet.Type = TypeJSON
			if err := json.Unmarshal(payload, &packet.JSONData); err == nil {
				// Successfully parsed as JSON
				
				// Extract common fields
				if from, ok := packet.JSONData["from"].(string); ok {
					packet.FromNode = from
				}
				if to, ok := packet.JSONData["to"].(string); ok {
					packet.ToNode = to
				}
				if text, ok := packet.JSONData["payload"].(string); ok {
					packet.Text = text
				}
				if ts, ok := packet.JSONData["timestamp"].(string); ok {
					packet.Timestamp = ts
				}
			}
		} else if utf8.Valid(payload) && !containsBinaryData(payload) {
			// Probably text
			packet.Type = TypeText
			packet.Text = string(payload)
		} else {
			// Encoded but not in JSON format
			packet.Type = TypeEncoded
		}
	}
	
	return packet, nil
}

// containsBinaryData does a simple check to see if a byte slice likely contains binary data
// by checking for control characters that aren't common in text
func containsBinaryData(data []byte) bool {
	for _, b := range data {
		// Skip common control characters
		if b == '\n' || b == '\r' || b == '\t' {
			continue
		}
		
		// If we find a control character, it's probably binary data
		if b < 32 || b > 126 {
			return true
		}
	}
	return false
}

// FormatPacket formats a decoded packet for display
func FormatPacket(packet *DecodedPacket) string {
	var builder strings.Builder
	
	builder.WriteString(fmt.Sprintf("Topic: %s\n", packet.Topic))
	
	// Show basic topic structure
	builder.WriteString(fmt.Sprintf("Region Path: %s\n", packet.RegionPath))
	if packet.Version != "" {
		builder.WriteString(fmt.Sprintf("Version: %s\n", packet.Version))
	}
	if packet.Format != "" {
		builder.WriteString(fmt.Sprintf("Format: %s\n", packet.Format))
	}
	if packet.Channel != "" {
		builder.WriteString(fmt.Sprintf("Channel: %s\n", packet.Channel))
	}
	if packet.UserID != "" {
		builder.WriteString(fmt.Sprintf("User ID: %s\n", packet.UserID))
	}
	
	switch packet.Type {
	case TypeJSON:
		builder.WriteString("Type: JSON\n")
		if packet.FromNode != "" {
			builder.WriteString(fmt.Sprintf("From: %s\n", packet.FromNode))
		}
		if packet.ToNode != "" {
			builder.WriteString(fmt.Sprintf("To: %s\n", packet.ToNode))
		}
		if packet.Text != "" {
			builder.WriteString(fmt.Sprintf("Text: %s\n", packet.Text))
		}
		if packet.Timestamp != "" {
			builder.WriteString(fmt.Sprintf("Timestamp: %s\n", packet.Timestamp))
		}
		
		// Format remaining JSON data
		jsonBytes, _ := json.MarshalIndent(packet.JSONData, "", "  ")
		builder.WriteString(fmt.Sprintf("Data: %s\n", jsonBytes))
		
	case TypeEncoded:
		builder.WriteString("Type: Encoded (ServiceEnvelope)\n")
		
		// Display ServiceEnvelope metadata if available
		if packet.ChannelID != "" {
			builder.WriteString(fmt.Sprintf("Channel ID: %s\n", packet.ChannelID))
		}
		if packet.GatewayID != "" {
			builder.WriteString(fmt.Sprintf("Gateway ID: %s\n", packet.GatewayID))
		}
		if packet.PacketID != "" {
			builder.WriteString(fmt.Sprintf("Packet ID: %s\n", packet.PacketID))
		}
		if packet.FromNode != "" {
			builder.WriteString(fmt.Sprintf("From Node: %s\n", packet.FromNode))
		}
		if packet.ToNode != "" {
			builder.WriteString(fmt.Sprintf("To Node: %s\n", packet.ToNode))
		}
		if packet.Text != "" {
			builder.WriteString(fmt.Sprintf("Payload: %s\n", packet.Text))
		}
		
		// If we were able to parse as JSON, show the data
		if len(packet.JSONData) > 0 {
			jsonBytes, _ := json.MarshalIndent(packet.JSONData, "", "  ")
			builder.WriteString(fmt.Sprintf("Service Envelope: %s\n", jsonBytes))
		} else {
			// Show raw binary data
			builder.WriteString(fmt.Sprintf("Raw Data (%d bytes): %x\n", len(packet.RawData), packet.RawData))
		}
		
	case TypeText:
		builder.WriteString("Type: Text\n")
		builder.WriteString(fmt.Sprintf("Content: %s\n", packet.Text))
		
	default:
		// Debug case for unknown packet types
		builder.WriteString(fmt.Sprintf("Type: UNKNOWN (%s)\n", packet.Type))
		builder.WriteString("---DEBUG INFO---\n")
		builder.WriteString(fmt.Sprintf("Raw Payload (%d bytes): %x\n", len(packet.RawData), packet.RawData))
		
		// Try to show as string if possible
		if len(packet.RawData) > 0 {
			builder.WriteString(fmt.Sprintf("As String: %s\n", string(packet.RawData)))
		}
		
		// Topic parts
		topicParts := strings.Split(packet.Topic, "/")
		builder.WriteString("Topic Parts:\n")
		for i, part := range topicParts {
			builder.WriteString(fmt.Sprintf("  [%d]: %s\n", i, part))
		}
		
		// Show any JSON data if present
		if len(packet.JSONData) > 0 {
			jsonBytes, _ := json.MarshalIndent(packet.JSONData, "", "  ")
			builder.WriteString(fmt.Sprintf("JSON Data: %s\n", jsonBytes))
		}
	}
	
	return builder.String()
}