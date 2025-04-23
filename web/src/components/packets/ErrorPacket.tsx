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
      icon={<AlertTriangle className="h-4 w-4 text-neutral-100" />}
      iconBgColor="bg-red-500"
      label="Error"
    >
      <div className="text-red-400">
        {data.decodeError}
      </div>
    </PacketCard>
  );
};