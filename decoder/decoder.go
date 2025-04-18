package decoder

import (
	"encoding/json"
	"fmt"
	"strings"
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
		Topic:   topic,
		RawData: payload,
	}

	// Extract channel and other info from topic
	parts := strings.Split(topic, "/")
	if len(parts) < 4 {
		return packet, fmt.Errorf("invalid topic format: %s", topic)
	}

	// Set channel info (typically msh/REGION/STATE/NAME)
	packet.Channel = strings.Join(parts[1:4], "/")

	// Determine packet type from topic
	if strings.Contains(topic, "/json/") {
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
	} else if strings.Contains(topic, "/binary/") {
		// Binary protobuf payload
		packet.Type = TypeBinary
		// Note: Actual protobuf decoding would be done here using the 
		// generated proto files, but it's a complex task since we need
		// to determine which message type to use.
	} else if strings.Contains(topic, "/text/") {
		// Plain text payload
		packet.Type = TypeText
		packet.Text = string(payload)
	}

	return packet, nil
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
	}
	
	return builder.String()
}