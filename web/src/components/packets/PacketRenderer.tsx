import React from "react";
import { Packet, PortNum, PortNumByName } from "../../lib/types";
import { TextMessagePacket } from "./TextMessagePacket";
import { PositionPacket } from "./PositionPacket";
import { NodeInfoPacket } from "./NodeInfoPacket";
import { TelemetryPacket } from "./TelemetryPacket";
import { ErrorPacket } from "./ErrorPacket";
import { GenericPacket } from "./GenericPacket";

interface PacketRendererProps {
  packet: Packet;
}

export const PacketRenderer: React.FC<PacketRendererProps> = ({ packet }) => {
  const { data } = packet;

  // If there's a decode error, show the error packet
  if (data.decodeError) {
    return <ErrorPacket packet={packet} />;
  }

  // Get the PortNum enum value
  const portNumValue = typeof data.portNum === 'string' 
    ? PortNumByName[data.portNum] 
    : data.portNum;

  // Determine which component to use based on portNum
  switch (portNumValue) {
    case PortNum.TEXT_MESSAGE_APP:
      return <TextMessagePacket packet={packet} />;

    case PortNum.POSITION_APP:
      return <PositionPacket packet={packet} />;

    case PortNum.NODEINFO_APP:
      return <NodeInfoPacket packet={packet} />;

    case PortNum.TELEMETRY_APP:
      return <TelemetryPacket packet={packet} />;

    default:
      return <GenericPacket packet={packet} />;
  }
};
