package decoder

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
	
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	
	pb "meshstream/proto/generated/meshtastic"
)

// FormatTelemetryMessage formats a Telemetry message
func FormatTelemetryMessage(telemetry *pb.Telemetry) string {
	var builder strings.Builder
	
	if telemetry == nil {
		return "Error: nil telemetry data"
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
	jsonBytes, err := protojson.MarshalOptions{Multiline: true, Indent: "  "}.Marshal(telemetry)
	if err == nil {
		builder.WriteString("\nFull Telemetry Structure:\n")
		builder.WriteString(string(jsonBytes))
	}

	return builder.String()
}

// FormatPositionMessage formats a Position message
func FormatPositionMessage(position *pb.Position) string {
	var builder strings.Builder
	
	if position == nil {
		return "Error: nil position data"
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
	jsonBytes, err := protojson.MarshalOptions{Multiline: true, Indent: "  "}.Marshal(position)
	if err == nil {
		builder.WriteString("\nFull Position Structure:\n")
		builder.WriteString(string(jsonBytes))
	}

	return builder.String()
}

// FormatNodeInfoMessage formats a User message (used by the NODEINFO_APP port)
func FormatNodeInfoMessage(user *pb.User) string {
	var builder strings.Builder
	
	if user == nil {
		return "Error: nil user data"
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
	jsonBytes, err := protojson.MarshalOptions{Multiline: true, Indent: "  "}.Marshal(user)
	if err == nil {
		builder.WriteString("\nFull User Structure:\n")
		builder.WriteString(string(jsonBytes))
	}

	return builder.String()
}

// FormatWaypointMessage formats a Waypoint message
func FormatWaypointMessage(waypoint *pb.Waypoint) string {
	var builder strings.Builder
	
	if waypoint == nil {
		return "Error: nil waypoint data"
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
	jsonBytes, err := protojson.MarshalOptions{Multiline: true, Indent: "  "}.Marshal(waypoint)
	if err == nil {
		builder.WriteString("\nFull Waypoint Structure:\n")
		builder.WriteString(string(jsonBytes))
	}

	return builder.String()
}

// FormatDataMessage formats a Data message
func FormatDataMessage(data *pb.Data) string {
	if data == nil {
		return "Error: nil data"
	}
	
	var builder strings.Builder
	builder.WriteString(fmt.Sprintf("Data (Port: %s):\n", data.GetPortnum()))
	
	// Format payload based on port type
	payload := data.GetPayload()
	switch data.GetPortnum() {
	case pb.PortNum_TEXT_MESSAGE_APP:
		builder.WriteString(fmt.Sprintf("  Text Message: %s\n", string(payload)))
		
	case pb.PortNum_TEXT_MESSAGE_COMPRESSED_APP:
		builder.WriteString(fmt.Sprintf("  Compressed Text Message (%d bytes): %x\n", len(payload), payload))
		
	case pb.PortNum_TELEMETRY_APP:
		var telemetry pb.Telemetry
		if err := proto.Unmarshal(payload, &telemetry); err == nil {
			builder.WriteString(FormatTelemetryMessage(&telemetry))
		} else {
			builder.WriteString(fmt.Sprintf("  Failed to parse telemetry: %v\n", err))
			builder.WriteString(fmt.Sprintf("  Raw bytes (%d): %x\n", len(payload), payload))
		}
		
	case pb.PortNum_POSITION_APP:
		var position pb.Position
		if err := proto.Unmarshal(payload, &position); err == nil {
			builder.WriteString(FormatPositionMessage(&position))
		} else {
			builder.WriteString(fmt.Sprintf("  Failed to parse position: %v\n", err))
			builder.WriteString(fmt.Sprintf("  Raw bytes (%d): %x\n", len(payload), payload))
		}
		
	case pb.PortNum_NODEINFO_APP:
		var user pb.User
		if err := proto.Unmarshal(payload, &user); err == nil {
			builder.WriteString(FormatNodeInfoMessage(&user))
		} else {
			builder.WriteString(fmt.Sprintf("  Failed to parse node info: %v\n", err))
			builder.WriteString(fmt.Sprintf("  Raw bytes (%d): %x\n", len(payload), payload))
		}
		
	case pb.PortNum_WAYPOINT_APP:
		var waypoint pb.Waypoint
		if err := proto.Unmarshal(payload, &waypoint); err == nil {
			builder.WriteString(FormatWaypointMessage(&waypoint))
		} else {
			builder.WriteString(fmt.Sprintf("  Failed to parse waypoint: %v\n", err))
			builder.WriteString(fmt.Sprintf("  Raw bytes (%d): %x\n", len(payload), payload))
		}
		
	default:
		// For unknown types, show raw binary data
		builder.WriteString(fmt.Sprintf("  Binary data (%d bytes): %x\n", len(payload), payload))
		// If it looks like ASCII text, also show as text
		if IsASCII(payload) {
			builder.WriteString(fmt.Sprintf("  As text: %s\n", string(payload)))
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

// FormatPayload formats a payload based on its type and port number
func FormatPayload(payload interface{}, portNum pb.PortNum) string {
	if payload == nil {
		return "  No payload data\n"
	}
	
	switch portNum {
	case pb.PortNum_TEXT_MESSAGE_APP:
		// Text message
		if text, ok := payload.(string); ok {
			return fmt.Sprintf("  Text Message: %s\n", text)
		}
		
	case pb.PortNum_TEXT_MESSAGE_COMPRESSED_APP:
		// Compressed text
		if data, ok := payload.([]byte); ok {
			return fmt.Sprintf("  Compressed Text Message (%d bytes): %x\n", len(data), data)
			// TODO: Add decompression support
		}
		
	case pb.PortNum_TELEMETRY_APP:
		// Telemetry data
		if telemetry, ok := payload.(*pb.Telemetry); ok {
			return FormatTelemetryMessage(telemetry)
		}
		
	case pb.PortNum_POSITION_APP:
		// Position data
		if position, ok := payload.(*pb.Position); ok {
			return FormatPositionMessage(position)
		}
		
	case pb.PortNum_NODEINFO_APP:
		// Node information
		if user, ok := payload.(*pb.User); ok {
			return FormatNodeInfoMessage(user)
		}
		
	case pb.PortNum_WAYPOINT_APP:
		// Waypoint data
		if waypoint, ok := payload.(*pb.Waypoint); ok {
			return FormatWaypointMessage(waypoint)
		}
	}
	
	// Default formatting for unknown types
	switch v := payload.(type) {
	case string:
		return fmt.Sprintf("  Text: %s\n", v)
	case []byte:
		result := fmt.Sprintf("  Binary (%d bytes): %x\n", len(v), v)
		if IsASCII(v) {
			result += fmt.Sprintf("  As text: %s\n", string(v))
		}
		return result
	default:
		return fmt.Sprintf("  Payload of type %T\n", payload)
	}
}

// FormatDecodedPacket formats a DecodedPacket into a human-readable string
func FormatDecodedPacket(packet *DecodedPacket) string {
	var builder strings.Builder
	
	if packet == nil {
		return "Error: nil packet"
	}
	
	if packet.DecodeError != nil {
		builder.WriteString(fmt.Sprintf("Error decoding packet: %v\n", packet.DecodeError))
		return builder.String()
	}
	
	// Envelope info
	builder.WriteString("Packet:\n")
	builder.WriteString(fmt.Sprintf("  Channel ID: %s\n", packet.ChannelID))
	if packet.GatewayID != "" {
		builder.WriteString(fmt.Sprintf("  Gateway ID: %s\n", packet.GatewayID))
	}
	
	// Mesh packet info
	builder.WriteString(fmt.Sprintf("  ID: %d\n", packet.ID))
	builder.WriteString(fmt.Sprintf("  From: %d\n", packet.From))
	builder.WriteString(fmt.Sprintf("  To: %d\n", packet.To))
	
	// Additional fields that might be interesting
	builder.WriteString(fmt.Sprintf("  Port: %s\n", packet.PortNum))
	
	if packet.HopLimit != 0 {
		builder.WriteString(fmt.Sprintf("  Hop Limit: %d\n", packet.HopLimit))
	}
	if packet.HopStart != 0 {
		builder.WriteString(fmt.Sprintf("  Hop Start: %d\n", packet.HopStart))
	}
	if packet.WantACK {
		builder.WriteString("  Wants ACK: Yes\n")
	}
	if packet.ViaMQTT {
		builder.WriteString("  Via MQTT: Yes\n")
	}
	if packet.NextHop != 0 {
		builder.WriteString(fmt.Sprintf("  Next Hop: %d\n", packet.NextHop))
	}
	if packet.RelayNode != 0 {
		builder.WriteString(fmt.Sprintf("  Relay Node: %d\n", packet.RelayNode))
	}
	
	// Additional data fields
	if packet.RequestID != 0 {
		builder.WriteString(fmt.Sprintf("  Request ID: %d\n", packet.RequestID))
	}
	if packet.ReplyID != 0 {
		builder.WriteString(fmt.Sprintf("  Reply ID: %d\n", packet.ReplyID))
	}
	if packet.Emoji != 0 {
		builder.WriteString(fmt.Sprintf("  Emoji: %d\n", packet.Emoji))
	}
	if packet.Dest != 0 {
		builder.WriteString(fmt.Sprintf("  Destination Node: %d\n", packet.Dest))
	}
	if packet.Source != 0 {
		builder.WriteString(fmt.Sprintf("  Source Node: %d\n", packet.Source))
	}
	if packet.WantResponse {
		builder.WriteString("  Wants Response: Yes\n")
	}
	
	// Format the payload
	builder.WriteString("\n")
	builder.WriteString(FormatPayload(packet.Payload, packet.PortNum))
	
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
			builder.WriteString(FormatDataMessage(packet.GetDecoded()))
			
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
						builder.WriteString(indent(FormatDataMessage(&data), "    "))
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

// FormatTopicAndPacket formats both topic information and a decoded packet
func FormatTopicAndPacket(topicInfo *TopicInfo, decodedPacket *DecodedPacket) string {
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
	
	// Format the decoded packet
	builder.WriteString(FormatDecodedPacket(decodedPacket))
	
	return builder.String()
}

// FormatTopicAndJSONData formats both topic information and decoded JSON data
func FormatTopicAndJSONData(topicInfo *TopicInfo, jsonData map[string]interface{}) string {
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
	
	// Format the JSON data
	builder.WriteString(FormatJSONMessage(jsonData))
	
	return builder.String()
}

// FormatTopicAndRawData formats topic information and raw data for unsupported formats
func FormatTopicAndRawData(topicInfo *TopicInfo, payload []byte) string {
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
	
	// Display raw data
	builder.WriteString(fmt.Sprintf("Unsupported format: %s\n", topicInfo.Format))
	builder.WriteString(fmt.Sprintf("Raw Data (%d bytes): %x\n", len(payload), payload))
	
	return builder.String()
}