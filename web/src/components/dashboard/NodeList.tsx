import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppSelector } from "../../hooks";
import { RefreshCw } from "lucide-react";
import { MeshCard } from "./MeshCard";

export const NodeList: React.FC = () => {
  const { nodes } = useAppSelector((state) => state.aggregator);
  const navigate = useNavigate();

  // Convert nodes object to array for sorting
  const nodeArray = Object.values(nodes);

  // Sort by node ID (stable)
  const sortedNodes = nodeArray.sort((a, b) => a.nodeId - b.nodeId);

  const handleNodeClick = (nodeId: number) => {
    navigate({ to: "/node/$nodeId", params: { nodeId: nodeId.toString() } });
  };

  if (nodeArray.length === 0) {
    return (
      <div className="p-6 text-neutral-400 text-center border border-neutral-700 rounded bg-neutral-800/50">
        <div className="flex items-center justify-center mb-2">
          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
        </div>
        No nodes discovered yet. Waiting for data...
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-neutral-200">Mesh Nodes</h2>
        <div className="text-sm text-neutral-400 bg-neutral-800/70 px-2 py-0.5 rounded">
          {nodeArray.length} {nodeArray.length === 1 ? "node" : "nodes"}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-2">
        {sortedNodes.map((node) => {
          // Calculate time since last heard (in seconds)
          const secondsSinceLastHeard = Date.now() / 1000 - node.lastHeard;

          // Determine node activity status:
          // Recent: < 10 minutes (green)
          // Active: 10-30 minutes (blue)
          // Inactive: > 30 minutes (grey)
          const isRecent = secondsSinceLastHeard < 600; // 10 minutes
          const isActive = !isRecent && secondsSinceLastHeard < 1800; // 10-30 minutes

          return (
            <MeshCard
              key={node.nodeId}
              type="node"
              nodeId={node.nodeId}
              nodeData={node}
              onClick={handleNodeClick}
              isRecent={isRecent}
              isActive={isActive}
              lastHeard={node.lastHeard}
            />
          );
        })}
      </div>
    </div>
  );
};
