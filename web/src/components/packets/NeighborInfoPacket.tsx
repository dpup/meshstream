import React from "react";
import { Link } from "@tanstack/react-router";
import { Packet } from "../../lib/types";
import { Network } from "lucide-react";
import { PacketCard } from "./PacketCard";
import { useAppSelector } from "../../hooks";
import { ConnectionRow, ConnectionList } from "../ui/ConnectionRow";

interface NeighborInfoPacketProps {
  packet: Packet;
}

export const NeighborInfoPacket: React.FC<NeighborInfoPacketProps> = ({ packet }) => {
  const { data } = packet;
  const neighborInfo = data.neighborInfo;
  const { nodes } = useAppSelector((state) => state.aggregator);
  
  if (!neighborInfo) {
    return null;
  }
  
  const formatNodeId = (nodeId: number): string => {
    return `!${nodeId.toString(16).toLowerCase()}`;
  };

  const getNodeName = (nodeId: number): string => {
    const node = nodes[nodeId];
    return node?.shortName || node?.longName || formatNodeId(nodeId);
  };

  const formatTime = (timestamp?: number): string => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const formatInterval = (seconds?: number): string => {
    if (!seconds) return "Unknown";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  return (
    <PacketCard
      packet={packet}
      icon={<Network />}
      iconBgColor="bg-blue-500"
      label="Neighbor Info"
    >
      <div className="flex flex-col gap-3">
        {/* Header with reporting node info */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-400">Reporting node:</span>
          <Link
            to="/node/$nodeId"
            params={{ nodeId: neighborInfo.nodeId.toString(16) }}
            className="text-blue-400 hover:text-blue-300 transition-colors font-mono"
          >
            {getNodeName(neighborInfo.nodeId)}
          </Link>
          {neighborInfo.nodeBroadcastIntervalSecs && (
            <span className="text-neutral-500 text-xs">
              (broadcasts every {formatInterval(neighborInfo.nodeBroadcastIntervalSecs)})
            </span>
          )}
        </div>

        {/* Neighbors list */}
        {neighborInfo.neighbors && neighborInfo.neighbors.length > 0 ? (
          <ConnectionList count={neighborInfo.neighbors.length} label="neighbor">
            {neighborInfo.neighbors.map((neighbor, index) => (
              <ConnectionRow
                key={index}
                name={getNodeName(neighbor.nodeId)}
                nameHref={`/node/${neighbor.nodeId.toString(16)}`}
                snrValues={[{ label: "", value: neighbor.snr }]}
                time={neighbor.lastRxTime ? formatTime(neighbor.lastRxTime) : undefined}
              />
            ))}
          </ConnectionList>
        ) : (
          <div className="text-sm text-neutral-500 italic">No neighbors reported</div>
        )}
      </div>
    </PacketCard>
  );
};