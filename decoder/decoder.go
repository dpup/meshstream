package decoder

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
	
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

// IsASCII checks if the given byte array contains only ASCII characters
func IsASCII(data []byte) bool {
	for _, b := range data {
		// Check for non-control ASCII characters and common control characters
		if (b < 32 && b != 9 && b != 10 && b != 13) || b > 126 {
			return false
		}
	}
	return true
}

// FormatTelemetryMessage formats a Telemetry message
func FormatTelemetryMessage(payload []byte) string {
	var builder strings.Builder
	var telemetry pb.Telemetry
	
	if err := proto.Unmarshal(payload, &telemetry); err != nil {
		return fmt.Sprintf("Failed to unmarshal telemetry data: %v\nRaw: %x", err, payload)
	}

	builder.WriteString("Telemetry Data:\n")
	
	if telemetry.GetTime() != 0 {
		tm := time.Unix(int64(telemetry.GetTime()), 0)
		builder.WriteString(fmt.Sprintf("  Time: %s\n", tm.Format(time.RFC3339)))
	}

	// Check which telemetry type we have
	if env := telemetry.GetEnvironmentMetrics(); env != nil {
		builder.WriteString("  Environment Telemetry:\n")
		
		temp := env.GetTemperature()
		if temp != 0 {
			builder.WriteString(fmt.Sprintf("    Temperature: %.2f °C\n", temp))
		}
		
		humidity := env.GetRelativeHumidity()
		if humidity != 0 {
			builder.WriteString(fmt.Sprintf("    Humidity: %.2f %%\n", humidity))
		}
		
		pressure := env.GetBarometricPressure()
		if pressure != 0 {
			builder.WriteString(fmt.Sprintf("    Pressure: %.2f hPa\n", pressure))
		}
		
		gasRes := env.GetGasResistance()
		if gasRes != 0 {
			builder.WriteString(fmt.Sprintf("    Gas Resistance: %.2f MΩ\n", gasRes))
		}
		
		iaq := env.GetIaq()
		if iaq != 0 {
			builder.WriteString(fmt.Sprintf("    Air Quality (IAQ): %d\n", iaq))
		}
		
		distance := env.GetDistance()
		if distance != 0 {
			builder.WriteString(fmt.Sprintf("    Distance: %.1f mm\n", distance))
		}
		
		lux := env.GetLux()
		if lux != 0 {
			builder.WriteString(fmt.Sprintf("    Light: %.1f lux\n", lux))
		}
		
		windDir := env.GetWindDirection()
		if windDir != 0 {
			directions := []string{"N", "NE", "E", "SE", "S", "SW", "W", "NW"}
			dirIndex := int(windDir / 45) % 8
			builder.WriteString(fmt.Sprintf("    Wind Direction: %d° (%s)\n", windDir, directions[dirIndex]))
		}
		
		windSpeed := env.GetWindSpeed()
		if windSpeed != 0 {
			builder.WriteString(fmt.Sprintf("    Wind Speed: %.1f m/s\n", windSpeed))
		}
		
		windGust := env.GetWindGust()
		if windGust != 0 {
			builder.WriteString(fmt.Sprintf("    Wind Gust: %.1f m/s\n", windGust))
		}
	}

	if power := telemetry.GetPowerMetrics(); power != nil {
		builder.WriteString("  Power Telemetry:\n")
		
		ch1Volt := power.GetCh1Voltage()
		if ch1Volt != 0 {
			builder.WriteString(fmt.Sprintf("    Channel 1 Voltage: %.2f V\n", ch1Volt))
		}
		
		ch1Curr := power.GetCh1Current()
		if ch1Curr != 0 {
			builder.WriteString(fmt.Sprintf("    Channel 1 Current: %.2f mA\n", ch1Curr))
		}
		
		ch2Volt := power.GetCh2Voltage()
		if ch2Volt != 0 {
			builder.WriteString(fmt.Sprintf("    Channel 2 Voltage: %.2f V\n", ch2Volt))
		}
		
		ch2Curr := power.GetCh2Current()
		if ch2Curr != 0 {
			builder.WriteString(fmt.Sprintf("    Channel 2 Current: %.2f mA\n", ch2Curr))
		}
		
		ch3Volt := power.GetCh3Voltage()
		if ch3Volt != 0 {
			builder.WriteString(fmt.Sprintf("    Channel 3 Voltage: %.2f V\n", ch3Volt))
		}
		
		ch3Curr := power.GetCh3Current()
		if ch3Curr != 0 {
			builder.WriteString(fmt.Sprintf("    Channel 3 Current: %.2f mA\n", ch3Curr))
		}
	}

	if air := telemetry.GetAirQualityMetrics(); air != nil {
		builder.WriteString("  Air Quality Telemetry:\n")
		
		pm10 := air.GetPm10Standard()
		if pm10 != 0 {
			builder.WriteString(fmt.Sprintf("    PM 1.0: %d µg/m³\n", pm10))
		}
		
		pm25 := air.GetPm25Standard()
		if pm25 != 0 {
			builder.WriteString(fmt.Sprintf("    PM 2.5: %d µg/m³\n", pm25))
		}
		
		pm100 := air.GetPm100Standard()
		if pm100 != 0 {
			builder.WriteString(fmt.Sprintf("    PM 10.0: %d µg/m³\n", pm100))
		}
		
		co2 := air.GetCo2()
		if co2 != 0 {
			builder.WriteString(fmt.Sprintf("    CO2: %d ppm\n", co2))
		}
		
		// VOC field not available in this version of the proto
	}
	
	// Device metrics
	if device := telemetry.GetDeviceMetrics(); device != nil {
		builder.WriteString("  Device Metrics:\n")
		
		batLevel := device.GetBatteryLevel()
		if batLevel != 0 {
			builder.WriteString(fmt.Sprintf("    Battery Level: %d%%\n", batLevel))
		}
		
		voltage := device.GetVoltage()
		if voltage != 0 {
			builder.WriteString(fmt.Sprintf("    Voltage: %.2f V\n", voltage))
		}
		
		chanUtil := device.GetChannelUtilization()
		if chanUtil != 0 {
			builder.WriteString(fmt.Sprintf("    Channel Utilization: %.2f%%\n", chanUtil))
		}
		
		airUtil := device.GetAirUtilTx()
		if airUtil != 0 {
			builder.WriteString(fmt.Sprintf("    Air Utilization TX: %.2f%%\n", airUtil))
		}
		
		uptime := device.GetUptimeSeconds()
		if uptime != 0 {
			uptimeDur := time.Duration(uptime) * time.Second
			builder.WriteString(fmt.Sprintf("    Uptime: %s\n", uptimeDur))
		}
	}
	
	// Local stats
	if stats := telemetry.GetLocalStats(); stats != nil {
		builder.WriteString("  Local Statistics:\n")
		if stats.GetUptimeSeconds() != 0 {
			uptime := time.Duration(stats.GetUptimeSeconds()) * time.Second
			builder.WriteString(fmt.Sprintf("    Uptime: %s\n", uptime))
		}
		if stats.GetChannelUtilization() != 0 {
			builder.WriteString(fmt.Sprintf("    Channel Utilization: %.2f%%\n", stats.GetChannelUtilization()))
		}
		if stats.GetAirUtilTx() != 0 {
			builder.WriteString(fmt.Sprintf("    Air Utilization TX: %.2f%%\n", stats.GetAirUtilTx()))
		}
		if stats.GetNumPacketsTx() != 0 {
			builder.WriteString(fmt.Sprintf("    Packets Transmitted: %d\n", stats.GetNumPacketsTx()))
		}
		if stats.GetNumPacketsRx() != 0 {
			builder.WriteString(fmt.Sprintf("    Packets Received: %d\n", stats.GetNumPacketsRx()))
		}
		if stats.GetNumPacketsRxBad() != 0 {
			builder.WriteString(fmt.Sprintf("    Bad Packets Received: %d\n", stats.GetNumPacketsRxBad()))
		}
		if stats.GetNumOnlineNodes() != 0 {
			builder.WriteString(fmt.Sprintf("    Online Nodes: %d\n", stats.GetNumOnlineNodes()))
		}
		if stats.GetNumTotalNodes() != 0 {
			builder.WriteString(fmt.Sprintf("    Total Nodes: %d\n", stats.GetNumTotalNodes()))
		}
	}
	
	// Health metrics
	if health := telemetry.GetHealthMetrics(); health != nil {
		builder.WriteString("  Health Metrics:\n")
		
		heartBpm := health.GetHeartBpm()
		if heartBpm != 0 {
			builder.WriteString(fmt.Sprintf("    Heart Rate: %d bpm\n", heartBpm))
		}
		
		spo2 := health.GetSpO2()
		if spo2 != 0 {
			builder.WriteString(fmt.Sprintf("    SpO2: %d%%\n", spo2))
		}
		
		temp := health.GetTemperature()
		if temp != 0 {
			builder.WriteString(fmt.Sprintf("    Body Temperature: %.1f °C\n", temp))
		}
	}

	// Marshal to JSON for detailed view
	jsonBytes, err := protojson.MarshalOptions{Multiline: true, Indent: "  "}.Marshal(&telemetry)
	if err == nil {
		builder.WriteString("\nFull Telemetry Structure:\n")
		builder.WriteString(string(jsonBytes))
	}

	return builder.String()
}

// FormatPositionMessage formats a Position message
func FormatPositionMessage(payload []byte) string {
	var builder strings.Builder
	var position pb.Position
	
	if err := proto.Unmarshal(payload, &position); err != nil {
		return fmt.Sprintf("Failed to unmarshal position data: %v\nRaw: %x", err, payload)
	}

	builder.WriteString("Position Data:\n")

	// Check if we have valid position data
	if position.GetLatitudeI() != 0 && position.GetLongitudeI() != 0 {
		// Convert the integer coordinates to floating-point degrees
		// Meshtastic uses a format where the values are stored as integers
		// representing the position multiplied by 1e7 (10 million)
		lat := float64(position.GetLatitudeI()) / 10000000.0
		lon := float64(position.GetLongitudeI()) / 10000000.0
		
		builder.WriteString(fmt.Sprintf("  Latitude: %.7f\n", lat))
		builder.WriteString(fmt.Sprintf("  Longitude: %.7f\n", lon))
		
		// Google Maps link for convenience
		builder.WriteString(fmt.Sprintf("  Google Maps: https://maps.google.com/?q=%.7f,%.7f\n", lat, lon))
	} else {
		builder.WriteString("  No valid latitude/longitude data\n")
	}

	// Add altitude if available
	if position.GetAltitude() != 0 {
		builder.WriteString(fmt.Sprintf("  Altitude: %d meters\n", position.GetAltitude()))
	}

	// Add time information
	if position.GetTime() != 0 {
		builder.WriteString(fmt.Sprintf("  Time: %d\n", position.GetTime()))
	}
	
	if position.GetTimestamp() != 0 {
		// Convert UNIX timestamp to readable time
		tm := time.Unix(int64(position.GetTimestamp()), 0)
		builder.WriteString(fmt.Sprintf("  Timestamp: %s\n", tm.Format(time.RFC3339)))
		
		if position.GetTimestampMillisAdjust() != 0 {
			builder.WriteString(fmt.Sprintf("  Millis adjustment: %d\n", position.GetTimestampMillisAdjust()))
		}
	}

	// Source info
	if position.GetLocationSource() != pb.Position_LOC_UNSET {
		builder.WriteString(fmt.Sprintf("  Location Source: %s\n", position.GetLocationSource()))
	}
	
	if position.GetAltitudeSource() != pb.Position_ALT_UNSET {
		builder.WriteString(fmt.Sprintf("  Altitude Source: %s\n", position.GetAltitudeSource()))
	}

	// GPS quality information if available
	if position.GetPDOP() != 0 {
		builder.WriteString(fmt.Sprintf("  PDOP: %.1f\n", float64(position.GetPDOP())/10))
	}
	if position.GetHDOP() != 0 {
		builder.WriteString(fmt.Sprintf("  HDOP: %.1f\n", float64(position.GetHDOP())/10))
	}
	if position.GetVDOP() != 0 {
		builder.WriteString(fmt.Sprintf("  VDOP: %.1f\n", float64(position.GetVDOP())/10))
	}
	if position.GetGpsAccuracy() != 0 {
		builder.WriteString(fmt.Sprintf("  GPS Accuracy: %d meters\n", position.GetGpsAccuracy()))
	}
	if position.GetGroundSpeed() != 0 {
		builder.WriteString(fmt.Sprintf("  Ground Speed: %.1f m/s\n", float64(position.GetGroundSpeed())/100))
	}
	if position.GetGroundTrack() != 0 {
		builder.WriteString(fmt.Sprintf("  Ground Track: %d°\n", position.GetGroundTrack()))
	}
	if position.GetSatsInView() != 0 {
		builder.WriteString(fmt.Sprintf("  Satellites in view: %d\n", position.GetSatsInView()))
	}

	// Marshal to JSON for detailed view
	jsonBytes, err := protojson.MarshalOptions{Multiline: true, Indent: "  "}.Marshal(&position)
	if err == nil {
		builder.WriteString("\nFull Position Structure:\n")
		builder.WriteString(string(jsonBytes))
	}

	return builder.String()
}

// FormatNodeInfoMessage formats a User message (used by the NODEINFO_APP port)
func FormatNodeInfoMessage(payload []byte) string {
	var builder strings.Builder
	var user pb.User
	
	if err := proto.Unmarshal(payload, &user); err != nil {
		return fmt.Sprintf("Failed to unmarshal node info data: %v\nRaw: %x", err, payload)
	}

	builder.WriteString("Node Information:\n")
	
	if user.GetId() != "" {
		builder.WriteString(fmt.Sprintf("  ID: %s\n", user.GetId()))
	}
	
	if user.GetLongName() != "" {
		builder.WriteString(fmt.Sprintf("  Name: %s\n", user.GetLongName()))
	}
	
	if user.GetShortName() != "" {
		builder.WriteString(fmt.Sprintf("  Short Name: %s\n", user.GetShortName()))
	}
	
	if user.GetHwModel() != pb.HardwareModel_UNSET {
		builder.WriteString(fmt.Sprintf("  Hardware: %s\n", user.GetHwModel()))
	}
	
	if user.GetIsLicensed() {
		builder.WriteString("  Licensed HAM operator\n")
	}
	
	if user.GetRole() != 0 {
		builder.WriteString(fmt.Sprintf("  Role: %s\n", user.GetRole()))
	}
	
	if len(user.GetPublicKey()) > 0 {
		builder.WriteString(fmt.Sprintf("  Public Key: %x\n", user.GetPublicKey()))
	}

	// Marshal to JSON for detailed view
	jsonBytes, err := protojson.MarshalOptions{Multiline: true, Indent: "  "}.Marshal(&user)
	if err == nil {
		builder.WriteString("\nFull User Structure:\n")
		builder.WriteString(string(jsonBytes))
	}

	return builder.String()
}

// FormatWaypointMessage formats a Waypoint message
func FormatWaypointMessage(payload []byte) string {
	var builder strings.Builder
	var waypoint pb.Waypoint
	
	if err := proto.Unmarshal(payload, &waypoint); err != nil {
		return fmt.Sprintf("Failed to unmarshal waypoint data: %v\nRaw: %x", err, payload)
	}

	builder.WriteString("Waypoint:\n")
	
	if waypoint.GetId() != 0 {
		builder.WriteString(fmt.Sprintf("  ID: %d\n", waypoint.GetId()))
	}
	
	if waypoint.GetName() != "" {
		builder.WriteString(fmt.Sprintf("  Name: %s\n", waypoint.GetName()))
	}
	
	if waypoint.GetDescription() != "" {
		builder.WriteString(fmt.Sprintf("  Description: %s\n", waypoint.GetDescription()))
	}
	
	if waypoint.GetLatitudeI() != 0 && waypoint.GetLongitudeI() != 0 {
		// Convert the integer coordinates to floating-point degrees
		lat := float64(waypoint.GetLatitudeI()) / 10000000.0
		lon := float64(waypoint.GetLongitudeI()) / 10000000.0
		
		builder.WriteString(fmt.Sprintf("  Latitude: %.7f\n", lat))
		builder.WriteString(fmt.Sprintf("  Longitude: %.7f\n", lon))
		
		// Google Maps link for convenience
		builder.WriteString(fmt.Sprintf("  Google Maps: https://maps.google.com/?q=%.7f,%.7f\n", lat, lon))
	}
	
	if waypoint.GetIcon() != 0 {
		builder.WriteString(fmt.Sprintf("  Icon: %d\n", waypoint.GetIcon()))
	}
	
	if waypoint.GetExpire() != 0 {
		// Convert UNIX timestamp to readable time
		tm := time.Unix(int64(waypoint.GetExpire()), 0)
		builder.WriteString(fmt.Sprintf("  Expires: %s\n", tm.Format(time.RFC3339)))
	}
	
	if waypoint.GetLockedTo() != 0 {
		builder.WriteString(fmt.Sprintf("  Locked to node: %d\n", waypoint.GetLockedTo()))
	}

	// Marshal to JSON for detailed view
	jsonBytes, err := protojson.MarshalOptions{Multiline: true, Indent: "  "}.Marshal(&waypoint)
	if err == nil {
		builder.WriteString("\nFull Waypoint Structure:\n")
		builder.WriteString(string(jsonBytes))
	}

	return builder.String()
}

// FormatData formats a Data message based on its port number
func FormatData(data *pb.Data) string {
	var builder strings.Builder
	
	builder.WriteString(fmt.Sprintf("Data (Port: %s):\n", data.GetPortnum()))
	
	// Format the payload based on the port number (application type)
	switch data.GetPortnum() {
	case pb.PortNum_TEXT_MESSAGE_APP:
		// Text messages are just plain text
		builder.WriteString(fmt.Sprintf("  Text Message: %s\n", string(data.GetPayload())))
		
	case pb.PortNum_TEXT_MESSAGE_COMPRESSED_APP:
		// Compressed text - ideally we'd decompress it
		builder.WriteString(fmt.Sprintf("  Compressed Text Message (%d bytes): %x\n", len(data.GetPayload()), data.GetPayload()))
		// If we had a decompressor: builder.WriteString(fmt.Sprintf("  Decompressed: %s\n", Decompress(data.GetPayload())))
		
	case pb.PortNum_TELEMETRY_APP:
		// Telemetry data
		builder.WriteString(FormatTelemetryMessage(data.GetPayload()))
		
	case pb.PortNum_POSITION_APP:
		// Position data
		builder.WriteString(FormatPositionMessage(data.GetPayload()))
		
	case pb.PortNum_NODEINFO_APP:
		// Node information
		builder.WriteString(FormatNodeInfoMessage(data.GetPayload()))
		
	case pb.PortNum_WAYPOINT_APP:
		// Waypoint data
		builder.WriteString(FormatWaypointMessage(data.GetPayload()))
		
	default:
		// For other message types, just print the payload as hex
		if len(data.GetPayload()) > 0 {
			builder.WriteString(fmt.Sprintf("  Payload (%d bytes): %x\n", len(data.GetPayload()), data.GetPayload()))
			
			// Try to display as text if it seems to be ASCII
			if IsASCII(data.GetPayload()) {
				builder.WriteString(fmt.Sprintf("  As text: %s\n", string(data.GetPayload())))
			}
		} else {
			builder.WriteString("  No payload\n")
		}
	}
	
	// Show additional Data fields
	if data.GetRequestId() != 0 {
		builder.WriteString(fmt.Sprintf("  Request ID: %d\n", data.GetRequestId()))
	}
	if data.GetReplyId() != 0 {
		builder.WriteString(fmt.Sprintf("  Reply ID: %d\n", data.GetReplyId()))
	}
	if data.GetEmoji() != 0 {
		builder.WriteString(fmt.Sprintf("  Emoji: %d\n", data.GetEmoji()))
	}
	if data.GetDest() != 0 {
		builder.WriteString(fmt.Sprintf("  Destination Node: %d\n", data.GetDest()))
	}
	if data.GetSource() != 0 {
		builder.WriteString(fmt.Sprintf("  Source Node: %d\n", data.GetSource()))
	}
	if data.GetWantResponse() {
		builder.WriteString("  Wants Response: Yes\n")
	}
	
	return builder.String()
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
			// For already decoded packets, use our specialized data formatter
			builder.WriteString("\n")
			builder.WriteString(FormatData(packet.GetDecoded()))
			
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
			
			// If the packet has channel ID, it's using channel-based encryption
			channelId := envelope.GetChannelId()
			if channelId != "" {
				builder.WriteString(fmt.Sprintf("    Encryption: Channel-based (Channel ID: %s)\n", channelId))
				
				// Attempt to decrypt the payload using the channel key
				channelKey := GetChannelKey(channelId)
				builder.WriteString(fmt.Sprintf("    Using key (%d bytes): %x\n", len(channelKey), channelKey))
				
				// Try to decrypt
				decrypted, err := XOR(packet.GetEncrypted(), channelKey, packet.GetId(), packet.GetFrom())
				if err != nil {
					builder.WriteString(fmt.Sprintf("    Decryption error: %v\n", err))
				} else {
					builder.WriteString(fmt.Sprintf("    Decrypted (%d bytes): %x\n", len(decrypted), decrypted))
					
					// Try to parse the decrypted payload as a Data message
					var data pb.Data
					if err := proto.Unmarshal(decrypted, &data); err == nil {
						// Successfully decoded the decrypted payload into a Data message
						// Use our specialized data formatter to show the message details
						builder.WriteString("\n")
						builder.WriteString(indent(FormatData(&data), "    "))
					} else {
						// If we couldn't parse as Data, try to interpret as text
						if IsASCII(decrypted) {
							builder.WriteString(fmt.Sprintf("    Decrypted as text: %s\n", string(decrypted)))
						} else {
							builder.WriteString(fmt.Sprintf("    Failed to parse decrypted data as pb.Data: %v\n", err))
						}
					}
				}
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

// indent adds indentation to each line of a string
func indent(s, prefix string) string {
	lines := strings.Split(s, "\n")
	for i, line := range lines {
		if line != "" {
			lines[i] = prefix + line
		}
	}
	return strings.Join(lines, "\n")
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