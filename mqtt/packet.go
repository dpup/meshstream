package mqtt

import (
	meshtreampb "meshstream/generated/meshstream"
)

// NewPacket creates a new Packet from a data packet and topic info
func NewPacket(data *meshtreampb.Data, topicInfo *meshtreampb.TopicInfo) *meshtreampb.Packet {
	return &meshtreampb.Packet{
		Data: data,
		Info: topicInfo,
	}
}
