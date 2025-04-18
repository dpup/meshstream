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
	TypeJSON   PacketType = "json"
	TypeBinary PacketType = "binary"
	TypeText   PacketType = "text"
)

// DecodedPacket contains information about a decoded packet
type DecodedPacket struct {
	Topic     string
	Channel   string
	Type      PacketType
	JSONData  map[string]interface{}
	FromNode  string
	ToNode    string
	Text      string
	RawData   []byte
	Timestamp string
}

// DecodePacket attempts to decode a packet from MQTT
func DecodePacket(topic string, payload []byte) (*DecodedPacket, error) {
	packet := &DecodedPacket{
		Topic:    topic,
		RawData:  payload,
		JSONData: make(map[string]interface{}),
	}

	// Extract channel and other info from topic
	parts := strings.Split(topic, "/")
	if len(parts) < 4 {
		return packet, fmt.Errorf("invalid topic format: %s", topic)
	}

	// Set channel info (typically msh/REGION/STATE/NAME)
	packet.Channel = strings.Join(parts[1:4], "/")

	// Try to determine type from topic structure
	if len(parts) >= 5 {
		typeIndicator := parts[4]
		
		switch typeIndicator {
		case "json":
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
			
		case "binary":
			// Binary protobuf payload
			packet.Type = TypeBinary
			// Note: Actual protobuf decoding would be done here
			
		case "text":
			// Plain text payload
			packet.Type = TypeText
			packet.Text = string(payload)
			
		default:
			// Try to infer type from payload
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
				// Probably binary
				packet.Type = TypeBinary
			}
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
	builder.WriteString(fmt.Sprintf("Channel: %s\n", packet.Channel))
	
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
		
	case TypeBinary:
		builder.WriteString("Type: Binary\n")
		builder.WriteString(fmt.Sprintf("Hex: %x\n", packet.RawData))
		
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