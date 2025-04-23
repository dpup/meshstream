import React from "react";
import { Packet } from "../../lib/types";
import { User } from "lucide-react";
import { PacketCard } from "./PacketCard";
import { KeyValueGrid, KeyValuePair } from "./KeyValuePair";

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
      icon={<User />}
      iconBgColor="bg-purple-500"
      label="Node Info"
      backgroundColor="bg-purple-950/5"
    >
      <div className="space-y-4 max-w-md">
        <KeyValuePair
          label="Long Name"
          value={nodeInfo.longName}
          large={true}
        />
        
        <KeyValueGrid>
          <KeyValuePair
            label="Short Name"
            value={nodeInfo.shortName}
          />
          <KeyValuePair
            label="ID"
            value={<span className="font-mono">{nodeInfo.id || "—"}</span>}
          />
          {nodeInfo.hwModel && (
            <KeyValuePair
              label="Hardware"
              value={nodeInfo.hwModel}
            />
          )}
          {nodeInfo.role && (
            <KeyValuePair
              label="Role"
              value={nodeInfo.role}
            />
          )}
          {nodeInfo.batteryLevel !== undefined && (
            <KeyValuePair
              label="Battery"
              value={`${nodeInfo.batteryLevel}%`}
            />
          )}
          {nodeInfo.lastHeard && (
            <KeyValuePair
              label="Last Heard"
              value={new Date(nodeInfo.lastHeard * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            />
          )}
        </KeyValueGrid>
      </div>
    </PacketCard>
  );
};