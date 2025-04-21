package decoder

import (
	"encoding/json"
	"fmt"
	"strings"
	
	"google.golang.org/protobuf/proto"
	
	pb "meshstream/proto/generated/meshtastic"
)

// DecodedPacket provides a simplified structure for decoded Meshtastic packets
type DecodedPacket struct {
	// From Service Envelope
	ChannelID string
	GatewayID string
	
	// From Mesh Packet
	ID       uint32
	From     uint32
	To       uint32
	HopLimit uint32
	HopStart uint32
	WantACK  bool
	Priority string
	ViaMQTT  bool
	NextHop  uint32
	RelayNode uint32
	
	// From Data
	PortNum pb.PortNum
	Payload interface{}
	
	// Additional Data fields
	RequestID uint32
	ReplyID   uint32
	Emoji     uint32
	Dest      uint32
	Source    uint32
	WantResponse bool
	
	// Error tracking
	DecodeError error
}

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

// DecodeMessage creates a DecodedPacket from a binary encoded message
func DecodeMessage(payload []byte, topicInfo *TopicInfo) *DecodedPacket {
	decoded := &DecodedPacket{}
	
	// First decode the envelope
	envelope, err := DecodeEncodedMessage(payload)
	if err != nil {
		decoded.DecodeError = err
		return decoded
	}
	
	// Extract envelope fields without storing raw envelope
	
	// Extract envelope fields
	decoded.ChannelID = envelope.GetChannelId()
	decoded.GatewayID = envelope.GetGatewayId()
	
	// Extract mesh packet fields if available
	packet := envelope.GetPacket()
	if packet == nil {
		decoded.DecodeError = fmt.Errorf("no mesh packet in envelope")
		return decoded
	}
	
	// Extract mesh packet fields without storing raw packet
	
	// Extract mesh packet fields
	decoded.ID = packet.GetId()
	decoded.From = packet.GetFrom()
	decoded.To = packet.GetTo()
	decoded.HopLimit = packet.GetHopLimit()
	decoded.HopStart = packet.GetHopStart()
	decoded.WantACK = packet.GetWantAck()
	decoded.Priority = packet.GetPriority().String()
	decoded.ViaMQTT = packet.GetViaMqtt()
	decoded.NextHop = packet.GetNextHop()
	decoded.RelayNode = packet.GetRelayNode()
	
	// Process the payload
	if packet.GetDecoded() != nil {
		// Packet has already been decoded
		decodeDataPayload(decoded, packet.GetDecoded())
	} else if packet.GetEncrypted() != nil {
		// Packet is encrypted, try to decrypt it
		decodeEncryptedPayload(decoded, packet.GetEncrypted(), envelope.GetChannelId(), packet.GetId(), packet.GetFrom())
	} else {
		decoded.DecodeError = fmt.Errorf("packet has no payload")
	}
	
	return decoded
}

// decodeDataPayload extracts information from a Data message
func decodeDataPayload(decoded *DecodedPacket, data *pb.Data) {
	// Extract data fields without storing raw data
	
	// Extract data fields
	decoded.PortNum = data.GetPortnum()
	decoded.RequestID = data.GetRequestId()
	decoded.ReplyID = data.GetReplyId()
	decoded.Emoji = data.GetEmoji()
	decoded.Dest = data.GetDest()
	decoded.Source = data.GetSource()
	decoded.WantResponse = data.GetWantResponse()
	
	// Process the payload based on port type
	payload := data.GetPayload()
	
	switch data.GetPortnum() {
	case pb.PortNum_TEXT_MESSAGE_APP:
		// Text message - just use the string
		decoded.Payload = string(payload)
		
	case pb.PortNum_TEXT_MESSAGE_COMPRESSED_APP:
		// Compressed text - just store the raw bytes for now
		// TODO: Add decompression support
		decoded.Payload = payload
		
	case pb.PortNum_POSITION_APP:
		// Position data
		var position pb.Position
		if err := proto.Unmarshal(payload, &position); err != nil {
			decoded.DecodeError = fmt.Errorf("failed to unmarshal Position data: %v", err)
		} else {
			decoded.Payload = &position
		}
		
	case pb.PortNum_NODEINFO_APP:
		// Node information
		var user pb.User
		if err := proto.Unmarshal(payload, &user); err != nil {
			decoded.DecodeError = fmt.Errorf("failed to unmarshal User data: %v", err)
		} else {
			decoded.Payload = &user
		}
		
	case pb.PortNum_TELEMETRY_APP:
		// Telemetry data
		var telemetry pb.Telemetry
		if err := proto.Unmarshal(payload, &telemetry); err != nil {
			decoded.DecodeError = fmt.Errorf("failed to unmarshal Telemetry data: %v", err)
		} else {
			decoded.Payload = &telemetry
		}
		
	case pb.PortNum_WAYPOINT_APP:
		// Waypoint data
		var waypoint pb.Waypoint
		if err := proto.Unmarshal(payload, &waypoint); err != nil {
			decoded.DecodeError = fmt.Errorf("failed to unmarshal Waypoint data: %v", err)
		} else {
			decoded.Payload = &waypoint
		}
		
	case pb.PortNum_MAP_REPORT_APP:
		// Map report data
		var mapReport pb.MapReport
		if err := proto.Unmarshal(payload, &mapReport); err != nil {
			decoded.DecodeError = fmt.Errorf("failed to unmarshal MapReport data: %v", err)
		} else {
			decoded.Payload = &mapReport
		}
		
	case pb.PortNum_TRACEROUTE_APP:
		// Traceroute data
		var routeDiscovery pb.RouteDiscovery
		if err := proto.Unmarshal(payload, &routeDiscovery); err != nil {
			decoded.DecodeError = fmt.Errorf("failed to unmarshal RouteDiscovery data: %v", err)
		} else {
			decoded.Payload = &routeDiscovery
		}
		
	case pb.PortNum_NEIGHBORINFO_APP:
		// Neighbor information data
		var neighborInfo pb.NeighborInfo
		if err := proto.Unmarshal(payload, &neighborInfo); err != nil {
			decoded.DecodeError = fmt.Errorf("failed to unmarshal NeighborInfo data: %v", err)
		} else {
			decoded.Payload = &neighborInfo
		}
		
	default:
		// For other types, just store the raw bytes
		decoded.Payload = payload
	}
}

// decodeEncryptedPayload tries to decrypt and decode encrypted payloads
func decodeEncryptedPayload(decoded *DecodedPacket, encrypted []byte, channelId string, packetId, fromNode uint32) {
	// Attempt to decrypt the payload using the channel key
	if channelId == "" {
		decoded.DecodeError = fmt.Errorf("encrypted packet has no channel ID")
		return
	}
	
	channelKey := GetChannelKey(channelId)
	decrypted, err := XOR(encrypted, channelKey, packetId, fromNode)
	if err != nil {
		decoded.DecodeError = fmt.Errorf("failed to decrypt payload: %v", err)
		return
	}
	
	// Try to parse as a Data message
	var data pb.Data
	if err := proto.Unmarshal(decrypted, &data); err != nil {
		// If we can't parse as Data, check if it's ASCII text
		if IsASCII(decrypted) {
			decoded.PortNum = pb.PortNum_TEXT_MESSAGE_APP
			decoded.Payload = string(decrypted)
		} else {
			decoded.DecodeError = fmt.Errorf("failed to parse decrypted data: %v", err)
			decoded.Payload = decrypted // Store raw bytes anyway
		}
	} else {
		// Successfully decoded the payload
		decodeDataPayload(decoded, &data)
	}
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