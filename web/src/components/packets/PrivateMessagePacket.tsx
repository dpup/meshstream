import React from "react";
import { Packet } from "../../lib/types";
import { Lock } from "lucide-react";
import { PacketCard } from "./PacketCard";

interface PrivateMessagePacketProps {
  packet: Packet;
}

export const PrivateMessagePacket: React.FC<PrivateMessagePacketProps> = ({ packet }) => {
  const { data } = packet;
  
  // Extract channel name from error message if available
  const channelMatch = data.decodeError?.match(/channel '([^']+)'/);
  const channelName = channelMatch?.[1] || packet.info.channel || "unknown";
  
  return (
    <PacketCard
      packet={packet}
      icon={<Lock />}
      iconBgColor="bg-gray-500"
      label="Private Message"
    >
      <div className="flex flex-col gap-3">
        <div className="text-gray-300 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" />
          <span>This message was encrypted for channel</span>
          <span className="font-mono text-gray-100 bg-gray-700/50 px-2 py-0.5 rounded">
            {channelName}
          </span>
        </div>
        
        <div className="text-xs text-gray-400 bg-gray-800/50 p-3 rounded border border-gray-700/30">
          This meshstream instance is not configured with the decryption key for this channel.
          The message content remains private and encrypted.
        </div>
        
        {data.binaryData && (
          <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">
              Show encrypted data
            </summary>
            <div className="mt-2 font-mono text-neutral-300 text-xs bg-neutral-800/80 p-3 rounded-md overflow-auto tracking-wide leading-relaxed border border-neutral-700/40">
              {data.binaryData}
            </div>
          </details>
        )}
      </div>
    </PacketCard>
  );
};