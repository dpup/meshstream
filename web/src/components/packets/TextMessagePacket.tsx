import React from "react";
import { Packet } from "../../lib/types";
import { MessageSquareText } from "lucide-react";

interface TextMessagePacketProps {
  packet: Packet;
}

export const TextMessagePacket: React.FC<TextMessagePacketProps> = ({ packet }) => {
  const { data } = packet;
  
  return (
    <div className="p-4 border border-neutral-700 rounded bg-neutral-800 shadow-inner">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <div className="rounded-md bg-blue-500 p-1.5 mr-3">
            <MessageSquareText className="h-4 w-4 text-neutral-100" />
          </div>
          <span className="font-medium text-neutral-200">
            From: {data.from ? `!${data.from.toString(16).toLowerCase()}` : "Unknown"}
          </span>
        </div>
        <span className="text-neutral-400 text-sm">
          ID: {data.id || "No ID"}
        </span>
      </div>
      
      <div className="mb-3 text-neutral-300 pl-9">
        {data.textMessage || "Empty message"}
      </div>
      
      <div className="mt-3 flex justify-between items-center text-xs text-neutral-500">
        <span>Channel: {packet.info.channel}</span>
        <span>Text Message</span>
      </div>
    </div>
  );
};