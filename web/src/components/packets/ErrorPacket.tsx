import React from "react";
import { Packet } from "../../lib/types";
import { AlertTriangle } from "lucide-react";
import { PacketCard } from "./PacketCard";

interface ErrorPacketProps {
  packet: Packet;
}

export const ErrorPacket: React.FC<ErrorPacketProps> = ({ packet }) => {
  const { data } = packet;
  
  if (!data.decodeError) {
    return null;
  }
  
  return (
    <PacketCard
      packet={packet}
      icon={<AlertTriangle />}
      iconBgColor="bg-red-500"
      label="Error"
    >
      <div className="max-w-md">
        <div className="text-red-400 mb-2 font-medium">
          {data.decodeError}
        </div>
        
        {data.binaryData && (
          <div className="mt-3">
            <div className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Raw Data</div>
            <div className="font-mono text-neutral-300 text-xs bg-neutral-800/80 p-3 rounded-md overflow-auto tracking-wide leading-relaxed border border-neutral-700/40">
              {data.binaryData}
            </div>
          </div>
        )}
      </div>
    </PacketCard>
  );
};