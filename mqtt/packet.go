package mqtt

import (
	"meshstream/decoder"
)

// Packet extends the DecodedPacket with MQTT topic information
type Packet struct {
	*decoder.DecodedPacket
	*decoder.TopicInfo
}