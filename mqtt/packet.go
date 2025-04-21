package mqtt

import (
	mesh "meshstream/proto/generated"
)

// Packet extends the DecodedPacket with MQTT topic information
type Packet struct {
	*mesh.Packet
}

// NewPacket creates a Packet from a decoded packet and topic info
func NewPacket(decoded *mesh.DecodedPacket, topicInfo *mesh.TopicInfo) *Packet {
	return &Packet{
		Packet: &mesh.Packet{
			DecodedPacket: decoded,
			TopicInfo:     topicInfo,
		},
	}
}

// Helper accessors to maintain backward compatibility with existing code
func (p *Packet) GetChannelID() string {
	if p.DecodedPacket != nil {
		return p.DecodedPacket.ChannelId
	}
	return ""
}

func (p *Packet) GetGatewayID() string {
	if p.DecodedPacket != nil {
		return p.DecodedPacket.GatewayId
	}
	return ""
}

func (p *Packet) GetID() uint32 {
	if p.DecodedPacket != nil {
		return p.DecodedPacket.Id
	}
	return 0
}

func (p *Packet) GetFrom() uint32 {
	if p.DecodedPacket != nil {
		return p.DecodedPacket.From
	}
	return 0
}

func (p *Packet) GetTo() uint32 {
	if p.DecodedPacket != nil {
		return p.DecodedPacket.To
	}
	return 0
}

func (p *Packet) GetPortNum() int32 {
	if p.DecodedPacket != nil {
		return int32(p.DecodedPacket.PortNum)
	}
	return 0
}

func (p *Packet) GetPortNumString() string {
	if p.DecodedPacket != nil {
		return p.DecodedPacket.PortNum.String()
	}
	return "UNKNOWN"
}

func (p *Packet) GetPayload() interface{} {
	if p.DecodedPacket == nil {
		return nil
	}

	// Depending on the payload type, return the appropriate value
	switch x := p.DecodedPacket.Payload.(type) {
	case *mesh.DecodedPacket_TextMessage:
		return x.TextMessage
	case *mesh.DecodedPacket_BinaryData:
		return x.BinaryData
	case *mesh.DecodedPacket_Position:
		return x.Position
	case *mesh.DecodedPacket_NodeInfo:
		return x.NodeInfo
	case *mesh.DecodedPacket_Telemetry:
		return x.Telemetry
	case *mesh.DecodedPacket_Waypoint:
		return x.Waypoint
	case *mesh.DecodedPacket_RouteDiscovery:
		return x.RouteDiscovery
	case *mesh.DecodedPacket_NeighborInfo:
		return x.NeighborInfo
	case *mesh.DecodedPacket_CompressedText:
		return x.CompressedText
	case *mesh.DecodedPacket_MapReport:
		return x.MapReport
	default:
		return nil
	}
}

func (p *Packet) GetHopLimit() uint32 {
	if p.DecodedPacket != nil {
		return p.DecodedPacket.HopLimit
	}
	return 0
}

func (p *Packet) GetHopStart() uint32 {
	if p.DecodedPacket != nil {
		return p.DecodedPacket.HopStart
	}
	return 0
}

func (p *Packet) HasDecodeError() bool {
	return p.DecodedPacket != nil && p.DecodedPacket.DecodeError != ""
}

func (p *Packet) GetDecodeError() string {
	if p.DecodedPacket != nil {
		return p.DecodedPacket.DecodeError
	}
	return ""
}

// GetFullTopic returns the MQTT topic this packet was received on
func (p *Packet) GetFullTopic() string {
	if p.TopicInfo != nil {
		return p.TopicInfo.FullTopic
	}
	return ""
}

// GetRegionPath returns the region path from the topic
func (p *Packet) GetRegionPath() string {
	if p.TopicInfo != nil {
		return p.TopicInfo.RegionPath
	}
	return ""
}

// GetChannel returns the channel name from the topic
func (p *Packet) GetChannel() string {
	if p.TopicInfo != nil {
		return p.TopicInfo.Channel
	}
	return ""
}