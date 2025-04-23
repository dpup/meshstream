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
      <div className="max-w-md">
        {data.textMessage || "Empty message"}
      </div>
    </PacketCard>
  );
};