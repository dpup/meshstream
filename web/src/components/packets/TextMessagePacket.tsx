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
      icon={<MessageSquareText className="h-4 w-4 text-neutral-100" />}
      iconBgColor="bg-blue-500"
      label="Text Message"
    >
      {data.textMessage || "Empty message"}
    </PacketCard>
  );
};