import React from "react";
import { useAppSelector } from "../../hooks";
import { RefreshCw } from "lucide-react";
import { MeshCard } from "./MeshCard";

export const GatewayList: React.FC = () => {
  const { gateways, nodes } = useAppSelector((state) => state.aggregator);

  // Convert gateways object to array for sorting
  const gatewayArray = Object.values(gateways);

  // Sort by number of observed nodes (highest first), then by last heard
  const sortedGateways = gatewayArray.sort((a, b) => {
    // Primary sort: number of observed nodes (descending)
    if (a.observedNodes.length !== b.observedNodes.length) {
      return b.observedNodes.length - a.observedNodes.length;
    }
    // Secondary sort: last heard time (most recent first)
    return b.lastHeard - a.lastHeard;
  });

  if (gatewayArray.length === 0) {
    return (
      <div className="p-6 text-neutral-400 text-center border border-neutral-700 rounded bg-neutral-800/50">
        <div className="flex items-center justify-center mb-2">
          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
        </div>
        No gateways discovered yet. Waiting for data...
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-neutral-200">
          Mesh Gateways
        </h2>
        <div className="text-sm text-neutral-400 bg-neutral-800/70 px-2 py-0.5 rounded">
          {gatewayArray.length}{" "}
          {gatewayArray.length === 1 ? "gateway" : "gateways"}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-2">
        {sortedGateways.map((gateway) => {
          // Extract node ID from gateway ID format if possible
          const nodeIdMatch = gateway.gatewayId.match(/^!([0-9a-f]+)/i);
          let nodeId = 0;
          let matchingNode = null;
          
          if (nodeIdMatch) {
            const nodeIdHex = nodeIdMatch[1];
            nodeId = parseInt(nodeIdHex, 16);
            matchingNode = nodes[nodeId];
          }
          
          // Determine if gateway is active (using stricter timeframe for gateways)
          const secondsSinceLastHeard = Date.now() / 1000 - gateway.lastHeard;
          const isRecent = secondsSinceLastHeard < 300; // 5 minutes for gateways
          const isActive = !isRecent && secondsSinceLastHeard < 900; // 5-15 minutes for gateways

          return (
            <MeshCard
              key={gateway.gatewayId}
              type="gateway"
              nodeId={nodeId}
              nodeData={matchingNode || {
                nodeId,
                lastHeard: gateway.lastHeard,
                messageCount: gateway.messageCount,
                textMessageCount: gateway.textMessageCount
              }}
              gatewayId={gateway.gatewayId}
              observedNodes={gateway.observedNodes}
              isRecent={isRecent}
              isActive={isActive}
              lastHeard={gateway.lastHeard}
            />
          );
        })}
      </div>
    </div>
  );
};
