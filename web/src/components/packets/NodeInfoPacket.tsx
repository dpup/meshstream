import React from "react";
import { Packet } from "../../lib/types";
import { User } from "lucide-react";
import { PacketCard } from "./PacketCard";

interface NodeInfoPacketProps {
  packet: Packet;
}

export const NodeInfoPacket: React.FC<NodeInfoPacketProps> = ({ packet }) => {
  const { data } = packet;
  const nodeInfo = data.nodeInfo;
  
  if (!nodeInfo) {
    return null;
  }
  
  return (
    <PacketCard
      packet={packet}
      icon={<User className="h-4 w-4 text-neutral-100" />}
      iconBgColor="bg-purple-500"
      label="Node Info"
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-neutral-400">Long Name</div>
          <div>{nodeInfo.longName || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-400">Short Name</div>
          <div>{nodeInfo.shortName || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-neutral-400">ID</div>
          <div className="font-mono">{nodeInfo.id || "—"}</div>
        </div>
      </div>
    </PacketCard>
  );
};