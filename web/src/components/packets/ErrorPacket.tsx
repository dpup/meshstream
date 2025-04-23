import React from "react";
import { Packet } from "../../lib/types";
import { AlertTriangle } from "lucide-react";

interface ErrorPacketProps {
  packet: Packet;
}

export const ErrorPacket: React.FC<ErrorPacketProps> = ({ packet }) => {
  const { data } = packet;
  
  if (!data.decodeError) {
    return null;
  }
  
  return (
    <div className="p-4 border border-red-900 rounded bg-neutral-800 shadow-inner">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <div className="rounded-md bg-red-500 p-1.5 mr-3">
            <AlertTriangle className="h-4 w-4 text-neutral-100" />
          </div>
          <span className="font-medium text-neutral-200">
            Decode Error
          </span>
        </div>
        <span className="text-neutral-400 text-sm">
          ID: {data.id || "No ID"}
        </span>
      </div>
      
      <div className="mb-3 text-red-400 pl-9">
        {data.decodeError}
      </div>
      
      <div className="mt-3 flex justify-between items-center text-xs text-neutral-500">
        <span>Channel: {packet.info.channel}</span>
        <span>Error</span>
      </div>
    </div>
  );
};