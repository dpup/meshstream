import React from "react";
import { Packet, PortNum } from "../../lib/types";
import { Package } from "lucide-react";
import { PacketCard } from "./PacketCard";
import { KeyValueGrid, KeyValuePair } from "../ui/KeyValuePair";

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
    if (data.binaryData) return "Binary Data";
    if (data.compressedText) return "Compressed Text";
    if (data.remoteHardware) return "Remote Hardware Control";
    if (data.routing) return "Routing Information";
    if (data.admin) return "Admin Command";
    if (data.audioData) return "Audio Data";
    if (data.alert) return `Alert: ${data.alert}`;
    if (data.reply) return `Reply: ${data.reply}`;
    
    return "Unknown Data Format";
  };
  
  const portName = getPortName(data.portNum);
  
  return (
    <PacketCard
      packet={packet}
      icon={<Package />}
      iconBgColor="bg-slate-500"
      label={portName.replace("_APP", "")}
      backgroundColor="bg-slate-950/5"
    >
      <div className="max-w-md">
        <KeyValueGrid>
          <KeyValuePair
            label="Port"
            value={portName}
            vertical={true}
          />
          <KeyValuePair
            label="Payload"
            value={getPayloadDescription()}
            vertical={true}
          />
          <KeyValuePair
            label="To"
            value={data.to === 4294967295 ? "Broadcast" : data.to.toString()}
            vertical={true}
            monospace={true}
          />
          <KeyValuePair
            label="Hop Limit"
            value={data.hopLimit}
            vertical={true}
            monospace={true}
          />
        </KeyValueGrid>
        
        {data.binaryData && (
          <div className="mt-3">
            <div className="text-xs text-neutral-400 mb-1">Binary Data</div>
            <div className="font-mono text-neutral-300 text-sm bg-neutral-800/50 p-2 rounded overflow-auto">
              {data.binaryData}
            </div>
          </div>
        )}
        
        {data.routing && (
          <div className="mt-3">
            <div className="text-xs text-neutral-400 mb-1">Routing Information</div>
            <div className="bg-neutral-800/50 p-2 rounded">
              {data.routing.errorReason !== undefined && (
                <div>Error: {PortNum[data.routing.errorReason] || data.routing.errorReason}</div>
              )}
              {data.routing.routeRequest && (
                <div>Route Request: {data.routing.routeRequest.route?.join(' → ')}</div>
              )}
              {data.routing.routeReply && (
                <div>Route Reply: {data.routing.routeReply.route?.join(' → ')}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </PacketCard>
  );
};