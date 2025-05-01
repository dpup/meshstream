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
      icon={<User />}
      iconBgColor="bg-purple-500"
      label="Node Info"
    >
      <div className="flex flex-col gap-1.5">
        {/* First row: Long name and short name */}
        <div className="flex flex-wrap items-center gap-2">
          {nodeInfo.longName && (
            <div className="text-base font-medium tracking-normal text-purple-200">
              {nodeInfo.longName}
            </div>
          )}
          
          {nodeInfo.shortName && (
            <div className="bg-purple-950/40 px-2 py-0.5 rounded text-purple-300 tracking-wider">
              {nodeInfo.shortName}
            </div>
          )}
        </div>
        
        {/* Second row: All technical details */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
          {nodeInfo.hwModel && (
            <div>
              <span className="text-neutral-500 mr-1">HW:</span>
              <span>{nodeInfo.hwModel}</span>
            </div>
          )}
          {nodeInfo.role && (
            <div>
              <span className="text-neutral-500 mr-1">ROLE:</span>
              <span>{nodeInfo.role}</span>
            </div>
          )}
          {nodeInfo.lastHeard && (
            <div>
              <span className="text-neutral-500 mr-1">LAST:</span>
              <span>{new Date(nodeInfo.lastHeard * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          )}
          {nodeInfo.batteryLevel !== undefined && (
            <div>
              <span className="text-neutral-500 mr-1">BAT:</span>
              <span>{nodeInfo.batteryLevel}%</span>
            </div>
          )}
          {nodeInfo.voltage !== undefined && (
            <div>
              <span className="text-neutral-500 mr-1">V:</span>
              <span>{nodeInfo.voltage.toFixed(1)}V</span>
            </div>
          )}
          {nodeInfo.snr !== undefined && (
            <div>
              <span className="text-neutral-500 mr-1">SNR:</span>
              <span>{nodeInfo.snr.toFixed(1)}dB</span>
            </div>
          )}
          {nodeInfo.channelUtilization !== undefined && (
            <div>
              <span className="text-neutral-500 mr-1">CH:</span>
              <span>{nodeInfo.channelUtilization.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    </PacketCard>
  );
};