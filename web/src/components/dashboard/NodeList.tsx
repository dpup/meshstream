import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppSelector } from "../../hooks";
import { RefreshCw } from "lucide-react";
import { MeshCard } from "./MeshCard";

export const NodeList: React.FC = () => {
  const { nodes, gateways } = useAppSelector((state) => state.aggregator);
  const navigate = useNavigate();

  // Create a set of node IDs that are already shown as gateways
  const gatewayNodeIds = new Set<number>();

  // Extract node IDs from gateway IDs
  Object.keys(gateways).forEach(gatewayId => {
    const nodeIdMatch = gatewayId.match(/^!([0-9a-f]+)/i);
    if (nodeIdMatch) {
      const nodeIdHex = nodeIdMatch[1];
      const nodeId = parseInt(nodeIdHex, 16);
      gatewayNodeIds.add(nodeId);
    }
  });

  // Convert nodes object to array and filter out gateway nodes and routers
  const nodeArray = Object.values(nodes).filter(node =>
    !gatewayNodeIds.has(node.nodeId) &&
    node.role !== "ROUTER"
  );

  // Sort by node ID (stable)
  const sortedNodes = nodeArray.sort((a, b) => a.nodeId - b.nodeId);

  const handleNodeClick = (nodeId: number) => {
    navigate({ to: "/node/$nodeId", params: { nodeId: nodeId.toString(16) } });
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-neutral-200">Nodes</h2>
        <div className="text-sm text-neutral-400 bg-neutral-800/70 px-2 py-0.5 rounded">
          {nodeArray.length} {nodeArray.length === 1 ? "node" : "nodes"}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-2">
        {nodeArray.length === 0 ? (
          <div className="bg-neutral-800/50 hover:bg-neutral-800 p-2 rounded-lg flex items-center">
            <div className="p-1.5 rounded-full bg-neutral-700/30 text-neutral-500 mr-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-neutral-400 truncate">
                {Object.keys(nodes).length > 0 ?
                  "All nodes are shown as gateways or routers above" :
                  "Waiting for node data..."}
              </div>
            </div>
          </div>
        ) : (
          sortedNodes.map((node) => {
            return (
              <MeshCard
                key={node.nodeId}
                type="node"
                nodeId={node.nodeId}
                nodeData={node}
                onClick={handleNodeClick}
                lastHeard={node.lastHeard}
              />
            );
          })
        )}
      </div>
    </div>
  );
};