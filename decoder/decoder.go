package decoder

import (
	"fmt"
	"strings"

	"google.golang.org/protobuf/proto"

	meshtreampb "meshstream/generated/meshstream"
	pb "meshstream/generated/meshtastic"
)

// ParseTopic parses a Meshtastic MQTT topic into its components
func ParseTopic(topic string) (*meshtreampb.TopicInfo, error) {
	info := &meshtreampb.TopicInfo{
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
		info.UserId = parts[userIdIndex]
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

// DecodeMessage creates a Data object from a binary encoded message
func DecodeMessage(payload []byte, topicInfo *meshtreampb.TopicInfo) *meshtreampb.Data {
	data := &meshtreampb.Data{}

	// First decode the envelope
	envelope, err := DecodeEncodedMessage(payload)
	if err != nil {
		data.DecodeError = err.Error()
		return data
	}

	// Extract envelope fields
	data.ChannelId = envelope.GetChannelId()
	data.GatewayId = envelope.GetGatewayId()

	// Extract mesh packet fields if available
	packet := envelope.GetPacket()
	if packet == nil {
		data.DecodeError = "no mesh packet in envelope"
		return data
	}

	// Extract mesh packet fields
	data.Id = packet.GetId()
	data.From = packet.GetFrom()
	data.To = packet.GetTo()
	data.HopLimit = packet.GetHopLimit()
	data.HopStart = packet.GetHopStart()
	data.WantAck = packet.GetWantAck()
	data.Priority = packet.GetPriority().String()
	data.ViaMqtt = packet.GetViaMqtt()
	data.NextHop = packet.GetNextHop()
	data.RelayNode = packet.GetRelayNode()

	// Process the payload
	if packet.GetDecoded() != nil {
		// Packet has already been decoded
		decodeDataPayload(data, packet.GetDecoded())
	} else if packet.GetEncrypted() != nil {
		// Packet is encrypted, try to decrypt it
		decodeEncryptedPayload(data, packet.GetEncrypted(), envelope.GetChannelId(), packet.GetId(), packet.GetFrom())
	} else {
		data.DecodeError = "packet has no payload"
	}

	return data
}

// decodeDataPayload extracts information from a Data message
func decodeDataPayload(data *meshtreampb.Data, pbData *pb.Data) {
	// Extract data fields
	data.PortNum = pbData.GetPortnum()
	data.RequestId = pbData.GetRequestId()
	data.ReplyId = pbData.GetReplyId()
	data.Emoji = pbData.GetEmoji()
	data.Dest = pbData.GetDest()
	data.Source = pbData.GetSource()
	data.WantResponse = pbData.GetWantResponse()

	// Process the payload based on port type
	payload := pbData.GetPayload()

	switch pbData.GetPortnum() {
	case pb.PortNum_TEXT_MESSAGE_APP:
		// Text message - store as string
		data.Payload = &meshtreampb.Data_TextMessage{
			TextMessage: string(payload),
		}

	case pb.PortNum_TEXT_MESSAGE_COMPRESSED_APP:
		// Compressed text - store the raw bytes
		data.Payload = &meshtreampb.Data_CompressedText{
			CompressedText: payload,
		}

	case pb.PortNum_POSITION_APP:
		// Position data
		var position pb.Position
		if err := proto.Unmarshal(payload, &position); err != nil {
			data.DecodeError = fmt.Sprintf("failed to unmarshal Position data: %v", err)
		} else {
			data.Payload = &meshtreampb.Data_Position{
				Position: &position,
			}
		}

	case pb.PortNum_NODEINFO_APP:
		// Node information
		var user pb.User
		if err := proto.Unmarshal(payload, &user); err != nil {
			data.DecodeError = fmt.Sprintf("failed to unmarshal User data: %v", err)
		} else {
			data.Payload = &meshtreampb.Data_NodeInfo{
				NodeInfo: &user,
			}
		}

	case pb.PortNum_TELEMETRY_APP:
		// Telemetry data
		var telemetry pb.Telemetry
		if err := proto.Unmarshal(payload, &telemetry); err != nil {
			data.DecodeError = fmt.Sprintf("failed to unmarshal Telemetry data: %v", err)
		} else {
			data.Payload = &meshtreampb.Data_Telemetry{
				Telemetry: &telemetry,
			}
		}

	case pb.PortNum_WAYPOINT_APP:
		// Waypoint data
		var waypoint pb.Waypoint
		if err := proto.Unmarshal(payload, &waypoint); err != nil {
			data.DecodeError = fmt.Sprintf("failed to unmarshal Waypoint data: %v", err)
		} else {
			data.Payload = &meshtreampb.Data_Waypoint{
				Waypoint: &waypoint,
			}
		}

	case pb.PortNum_MAP_REPORT_APP:
		// Map report data
		var mapReport pb.MapReport
		if err := proto.Unmarshal(payload, &mapReport); err != nil {
			data.DecodeError = fmt.Sprintf("failed to unmarshal MapReport data: %v", err)
		} else {
			data.Payload = &meshtreampb.Data_MapReport{
				MapReport: &mapReport,
			}
		}

	case pb.PortNum_TRACEROUTE_APP:
		// Traceroute data
		var routeDiscovery pb.RouteDiscovery
		if err := proto.Unmarshal(payload, &routeDiscovery); err != nil {
			data.DecodeError = fmt.Sprintf("failed to unmarshal RouteDiscovery data: %v", err)
		} else {
			data.Payload = &meshtreampb.Data_RouteDiscovery{
				RouteDiscovery: &routeDiscovery,
			}
		}

	case pb.PortNum_NEIGHBORINFO_APP:
		// Neighbor information data
		var neighborInfo pb.NeighborInfo
		if err := proto.Unmarshal(payload, &neighborInfo); err != nil {
			data.DecodeError = fmt.Sprintf("failed to unmarshal NeighborInfo data: %v", err)
		} else {
			data.Payload = &meshtreampb.Data_NeighborInfo{
				NeighborInfo: &neighborInfo,
			}
		}

	case pb.PortNum_REMOTE_HARDWARE_APP:
		// Remote hardware data
		var hardware pb.HardwareMessage
		if err := proto.Unmarshal(payload, &hardware); err != nil {
			data.DecodeError = fmt.Sprintf("failed to unmarshal HardwareMessage data: %v", err)
		} else {
			data.Payload = &meshtreampb.Data_RemoteHardware{
				RemoteHardware: &hardware,
			}
		}

	case pb.PortNum_ROUTING_APP:
		// Routing data
		var routing pb.Routing
		if err := proto.Unmarshal(payload, &routing); err != nil {
			data.DecodeError = fmt.Sprintf("failed to unmarshal Routing data: %v", err)
		} else {
			data.Payload = &meshtreampb.Data_Routing{
				Routing: &routing,
			}
		}

	case pb.PortNum_ADMIN_APP:
		// Admin data
		var admin pb.AdminMessage
		if err := proto.Unmarshal(payload, &admin); err != nil {
			data.DecodeError = fmt.Sprintf("failed to unmarshal AdminMessage data: %v", err)
		} else {
			data.Payload = &meshtreampb.Data_Admin{
				Admin: &admin,
			}
		}

	case pb.PortNum_PAXCOUNTER_APP:
		// Paxcount data
		var paxcount pb.Paxcount
		if err := proto.Unmarshal(payload, &paxcount); err != nil {
			data.DecodeError = fmt.Sprintf("failed to unmarshal Paxcount data: %v", err)
		} else {
			data.Payload = &meshtreampb.Data_Paxcounter{
				Paxcounter: &paxcount,
			}
		}

	default:
		// For other types, just store the raw bytes
		data.Payload = &meshtreampb.Data_BinaryData{
			BinaryData: payload,
		}
	}
}

// decodeEncryptedPayload tries to decrypt and decode encrypted payloads
func decodeEncryptedPayload(data *meshtreampb.Data, encrypted []byte, channelId string, packetId, fromNode uint32) {
	// Attempt to decrypt the payload using the channel key
	if channelId == "" {
		data.DecodeError = "encrypted packet has no channel ID"
		return
	}

	channelKey := GetChannelKey(channelId)
	decrypted, err := XOR(encrypted, channelKey, packetId, fromNode)
	if err != nil {
		data.DecodeError = fmt.Sprintf("failed to decrypt payload: %v", err)
		return
	}

	// Try to parse as a Data message
	var pbData pb.Data
	if err := proto.Unmarshal(decrypted, &pbData); err != nil {
		// If we can't parse as Data, check if it's ASCII text
		if IsASCII(decrypted) {
			data.PortNum = pb.PortNum_TEXT_MESSAGE_APP
			data.Payload = &meshtreampb.Data_TextMessage{
				TextMessage: string(decrypted),
			}
		} else {
			data.DecodeError = fmt.Sprintf("failed to parse decrypted data: %v", err)
			data.Payload = &meshtreampb.Data_BinaryData{
				BinaryData: decrypted,
			}
		}
	} else {
		// Successfully decoded the payload
		decodeDataPayload(data, &pbData)
	}
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