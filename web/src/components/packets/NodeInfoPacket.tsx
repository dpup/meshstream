import React from "react";
import { Packet } from "../../lib/types";
import { User } from "lucide-react";

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
    <div className="p-4 border border-neutral-700 rounded bg-neutral-800 shadow-inner">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <div className="rounded-md bg-purple-500 p-1.5 mr-3">
            <User className="h-4 w-4 text-neutral-100" />
          </div>
          <span className="font-medium text-neutral-200">
            From: {data.from || "Unknown"}
          </span>
        </div>
        <span className="text-neutral-400 text-sm">
          ID: {data.id || "No ID"}
        </span>
      </div>
      
      <div className="mb-3 text-neutral-300 pl-9">
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
      </div>
      
      <div className="mt-3 flex justify-between items-center text-xs text-neutral-500">
        <span>Channel: {packet.info.channel}</span>
        <span>Node Info</span>
      </div>
    </div>
  );
};