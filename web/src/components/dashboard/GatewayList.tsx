import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppSelector } from "../../hooks";
import { RefreshCw } from "lucide-react";
import { MeshCard } from "./MeshCard";

export const GatewayList: React.FC = () => {
  const { gateways, nodes } = useAppSelector((state) => state.aggregator);
  const navigate = useNavigate();

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

  // Instead of early return, we'll handle empty state in the JSX now

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-neutral-200">
          Gateways
        </h2>
        <div className="text-sm text-neutral-400 bg-neutral-800/70 px-2 py-0.5 rounded">
          {gatewayArray.length}{" "}
          {gatewayArray.length === 1 ? "gateway" : "gateways"}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-2">
        {gatewayArray.length === 0 ? (
          <div className="bg-neutral-800/50 hover:bg-neutral-800 p-2 rounded-lg flex items-center">
            <div className="p-1.5 rounded-full bg-neutral-700/30 text-neutral-500 mr-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-neutral-400 truncate">
                Waiting for gateway data...
              </div>
            </div>
          </div>
        ) : (
          sortedGateways.map((gateway) => {
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

            const handleNodeClick = (clickedNodeId: number) => {
              navigate({ to: "/node/$nodeId", params: { nodeId: clickedNodeId.toString(16) } });
            };
            
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
                observedNodes={gateway.observedNodes}
                onClick={handleNodeClick}
                isRecent={isRecent}
                isActive={isActive}
                lastHeard={gateway.lastHeard}
              />
            );
          })
        )}
      </div>
    </div>
  );
};