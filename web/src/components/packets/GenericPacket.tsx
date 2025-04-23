import React from "react";
import { Packet, PortNum, PortNumByName } from "../../lib/types";
import { Package } from "lucide-react";

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
    <div className="p-4 border border-neutral-700 rounded bg-neutral-800 shadow-inner">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <div className="rounded-md bg-neutral-500 p-1.5 mr-3">
            <Package className="h-4 w-4 text-neutral-100" />
          </div>
          <span className="font-medium text-neutral-200">
            From: {data.from || "Unknown"}
          </span>
        </div>
        <span className="text-neutral-400 text-sm">
          ID: {data.id || "No ID"}
        </span>
      </div>
      
      <div className="mb-3 text-neutral-300 pl-9">
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
      </div>
      
      <div className="mt-3 flex justify-between items-center text-xs text-neutral-500">
        <span>Channel: {packet.info.channel}</span>
        <span>{getPortName(data.portNum)}</span>
      </div>
    </div>
  );
};