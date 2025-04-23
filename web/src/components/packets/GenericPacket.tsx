import React from "react";
import { Packet, PortNum, PortNumByName } from "../../lib/types";
import { Package } from "lucide-react";
import { PacketCard } from "./PacketCard";

interface GenericPacketProps {
  packet: Packet;
}

export const GenericPacket: React.FC<GenericPacketProps> = ({ packet }) => {
  const { data } = packet;
  
  // Helper to get port name from enum
  const getPortName = (portNum: PortNum | string): string => {
    if (typeof portNum === 'string') {
      return portNum;
    }
    return PortNum[portNum] || "Unknown";
  };
  
  // Helper to get simple payload description
  const getPayloadDescription = () => {
    if (data.decodeError) {
      return `Error: ${data.decodeError}`;
    }
    
    // Determine what type of payload is present
    if (data.binaryData) return "Binary data";
    if (data.waypoint) return "Waypoint";
    if (data.compressedText) return "Compressed text";
    if (data.mapReport) return "Map report";
    if (data.remoteHardware) return "Remote hardware";
    if (data.routing) return "Routing";
    if (data.admin) return "Admin";
    if (data.audioData) return "Audio";
    if (data.alert) return `Alert: ${data.alert}`;
    if (data.reply) return `Reply: ${data.reply}`;
    
    return "Unknown data";
  };
  
  return (
    <PacketCard
      packet={packet}
      icon={<Package className="h-4 w-4 text-neutral-100" />}
      iconBgColor="bg-neutral-500"
      label={getPortName(data.portNum)}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-neutral-400">Port</div>
          <div>{getPortName(data.portNum)}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-400">Payload</div>
          <div>{getPayloadDescription()}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-400">To</div>
          <div>{data.to || "Broadcast"}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-400">Hop Limit</div>
          <div>{data.hopLimit}</div>
        </div>
      </div>
    </PacketCard>
  );
};