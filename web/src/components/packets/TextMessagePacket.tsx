import React from "react";
import { Packet } from "../../lib/types";
import { MessageSquareText } from "lucide-react";
import { PacketCard } from "./PacketCard";

interface TextMessagePacketProps {
  packet: Packet;
}

export const TextMessagePacket: React.FC<TextMessagePacketProps> = ({ packet }) => {
  const { data } = packet;
  
  return (
    <PacketCard
      packet={packet}
      icon={<MessageSquareText />}
      iconBgColor="bg-blue-500"
      label="Text Message"
      backgroundColor="bg-blue-950/5"
    >
      <div className="max-w-lg bg-neutral-800/30 p-3 rounded-md tracking-tight break-words">
        {data.textMessage || "Empty message"}
      </div>
    </PacketCard>
  );
};