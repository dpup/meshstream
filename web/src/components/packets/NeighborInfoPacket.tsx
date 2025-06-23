import React from "react";
import { Link } from "@tanstack/react-router";
import { Packet } from "../../lib/types";
import { Network, ExternalLink } from "lucide-react";
import { PacketCard } from "./PacketCard";
import { useAppSelector } from "../../hooks";

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
          <div className="flex flex-col gap-2">
            <div className="text-sm text-neutral-400">
              {neighborInfo.neighbors.length} neighbor{neighborInfo.neighbors.length !== 1 ? 's' : ''}:
            </div>
            <div className="grid gap-2">
              {neighborInfo.neighbors.map((neighbor, index) => (
                <div key={index} className="bg-neutral-800/50 rounded p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link
                      to="/node/$nodeId"
                      params={{ nodeId: neighbor.nodeId.toString(16) }}
                      className="text-blue-400 hover:text-blue-300 transition-colors font-mono flex items-center gap-1"
                    >
                      {getNodeName(neighbor.nodeId)}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-400">
                    <div>
                      <span className="text-neutral-500 mr-1">SNR:</span>
                      <span className={neighbor.snr > 0 ? "text-green-400" : neighbor.snr > -10 ? "text-yellow-400" : "text-red-400"}>
                        {neighbor.snr.toFixed(1)}dB
                      </span>
                    </div>
                    {neighbor.lastRxTime && (
                      <div>
                        <span className="text-neutral-500 mr-1">Last:</span>
                        <span>{formatTime(neighbor.lastRxTime)}</span>
                      </div>
                    )}
                    {neighbor.nodeBroadcastIntervalSecs && (
                      <div>
                        <span className="text-neutral-500 mr-1">Interval:</span>
                        <span>{formatInterval(neighbor.nodeBroadcastIntervalSecs)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-500 italic">No neighbors reported</div>
        )}
      </div>
    </PacketCard>
  );
};