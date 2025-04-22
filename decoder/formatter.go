package decoder

import (
	"fmt"
	"strings"

	meshtreampb "meshstream/generated/meshstream"
)

// FormatTopicAndPacket creates a human-readable representation of a topic and packet
// for debugging purposes.
func FormatTopicAndPacket(topic *meshtreampb.TopicInfo, data *meshtreampb.Data) string {
	var sb strings.Builder

	// Topic information
	sb.WriteString("===== Topic Info =====\n")
	sb.WriteString(fmt.Sprintf("Full Topic: %s\n", topic.FullTopic))
	sb.WriteString(fmt.Sprintf("Region Path: %s\n", topic.RegionPath))
	sb.WriteString(fmt.Sprintf("Version: %s\n", topic.Version))
	sb.WriteString(fmt.Sprintf("Format: %s\n", topic.Format))
	sb.WriteString(fmt.Sprintf("Channel: %s\n", topic.Channel))
	sb.WriteString(fmt.Sprintf("User ID: %s\n", topic.UserId))

	// Packet information
	sb.WriteString("\n===== Packet Info =====\n")
	
	// Check if we have a decode error
	if data.DecodeError != "" {
		sb.WriteString(fmt.Sprintf("ERROR: %s\n", data.DecodeError))
		return sb.String()
	}

	// Basic packet information
	sb.WriteString(fmt.Sprintf("ID: %d\n", data.Id))
	sb.WriteString(fmt.Sprintf("From: %d\n", data.From))
	sb.WriteString(fmt.Sprintf("To: %d\n", data.To))
	sb.WriteString(fmt.Sprintf("Channel ID: %s\n", data.ChannelId))
	sb.WriteString(fmt.Sprintf("Gateway ID: %s\n", data.GatewayId))
	sb.WriteString(fmt.Sprintf("Port: %s\n", data.PortNum.String()))
	sb.WriteString(fmt.Sprintf("Hop Limit: %d\n", data.HopLimit))
	sb.WriteString(fmt.Sprintf("Request ID: %d\n", data.RequestId))
	
	// Payload type-specific information
	sb.WriteString("\n===== Payload Info =====\n")
	
	switch data.Payload.(type) {
	case *meshtreampb.Data_TextMessage:
		sb.WriteString(fmt.Sprintf("Type: Text Message\nContent: %s\n", data.GetTextMessage()))
		
	case *meshtreampb.Data_Position:
		pos := data.GetPosition()
		lat := float64(pos.GetLatitudeI()) / 10000000.0
		lon := float64(pos.GetLongitudeI()) / 10000000.0
		sb.WriteString(fmt.Sprintf("Type: Position\nLatitude: %.6f\nLongitude: %.6f\nAltitude: %d\n", 
			lat, lon, pos.GetAltitude()))
		
	case *meshtreampb.Data_Telemetry:
		telemetry := data.GetTelemetry()
		sb.WriteString("Type: Telemetry\n")
		if telemetry.GetEnvironmentMetrics() != nil {
			env := telemetry.GetEnvironmentMetrics()
			sb.WriteString(fmt.Sprintf("Environment: Temp %.1f°C, Rel Humidity %.1f%%\n", 
				env.GetTemperature(), env.GetRelativeHumidity()))
		}
		if telemetry.GetDeviceMetrics() != nil {
			dev := telemetry.GetDeviceMetrics()
			sb.WriteString(fmt.Sprintf("Device: Battery %d%%, Voltage %.1fV\n", 
				dev.GetBatteryLevel(), dev.GetVoltage()))
		}
		
	case *meshtreampb.Data_NodeInfo:
		user := data.GetNodeInfo()
		sb.WriteString(fmt.Sprintf("Type: User Info\nID: %s\nLongName: %s\nShortName: %s\n", 
			user.GetId(), user.GetLongName(), user.GetShortName()))
		
	case *meshtreampb.Data_MapReport:
		sb.WriteString(fmt.Sprintf("Type: Map Report\n"))
		
	case *meshtreampb.Data_BinaryData:
		sb.WriteString(fmt.Sprintf("Type: Binary Data\nLength: %d bytes\n", len(data.GetBinaryData())))
		
	default:
		sb.WriteString("Type: Unknown\n")
	}
	
	return sb.String()
}