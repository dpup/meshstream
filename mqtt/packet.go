package mqtt

import (
	meshtreampb "meshstream/generated/meshstream"
)

// Type alias for proto packet.
type Packet meshtreampb.Packet

// NewPacket creates a Packet from a data packet and topic info
func NewPacket(data *meshtreampb.Data, topicInfo *meshtreampb.TopicInfo) *Packet {
	p := Packet(meshtreampb.Packet{
		Data: data,
		Info: topicInfo,
	})
	return &p
}
