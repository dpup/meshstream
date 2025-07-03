import React from "react";
import { Packet } from "../../lib/types";
import { Shield } from "lucide-react";
import { PacketCard } from "./PacketCard";

interface AdminMessagePacketProps {
  packet: Packet;
}

export const AdminMessagePacket: React.FC<AdminMessagePacketProps> = ({ packet }) => {
  return (
    <PacketCard
      packet={packet}
      icon={<Shield />}
      iconBgColor="bg-orange-500"
      label="Admin Message"
    >
      <div className="flex flex-col gap-3">
        <div className="text-gray-300 text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-orange-400" />
          <span>This message was an encrypted remote administration command</span>
        </div>
        
        <div className="text-xs text-gray-400 bg-gray-800/50 p-3 rounded border border-gray-700/30">
          Remote administration commands are encrypted using PKI and can only be decrypted by the authorized target device.
        </div>
        
        {packet.data.binaryData && (
          <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">
              Show encrypted data
            </summary>
            <div className="mt-2 font-mono text-neutral-300 text-xs bg-neutral-800/80 p-3 rounded-md overflow-auto tracking-wide leading-relaxed border border-neutral-700/40">
              {packet.data.binaryData}
            </div>
          </details>
        )}
      </div>
    </PacketCard>
  );
};