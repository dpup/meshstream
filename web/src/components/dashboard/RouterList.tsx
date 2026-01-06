import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppSelector } from "../../hooks";
import { RefreshCw } from "lucide-react";
import { MeshCard } from "./MeshCard";

export const RouterList: React.FC = () => {
  const { nodes } = useAppSelector((state) => state.aggregator);
  const navigate = useNavigate();

  // Filter nodes that are routers (role === "ROUTER")
  // Exclude nodes that are already shown as gateways
  const routerArray = Object.values(nodes).filter(
    (node) => node.role === "ROUTER" && !node.isGateway
  );

  // Sort by last heard time (most recent first)
  const sortedRouters = routerArray.sort((a, b) => {
    return b.lastHeard - a.lastHeard;
  });

  const handleNodeClick = (clickedNodeId: number) => {
    navigate({ to: "/node/$nodeId", params: { nodeId: clickedNodeId.toString(16) } });
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-neutral-200">
          Routers
        </h2>
        <div className="text-sm text-neutral-400 bg-neutral-800/70 px-2 py-0.5 rounded">
          {routerArray.length}{" "}
          {routerArray.length === 1 ? "router" : "routers"}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-2">
        {routerArray.length === 0 ? (
          <div className="bg-neutral-800/50 hover:bg-neutral-800 p-2 rounded-lg flex items-center">
            <div className="p-1.5 rounded-full bg-neutral-700/30 text-neutral-500 mr-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-neutral-400 truncate">
                Waiting for router data...
              </div>
            </div>
          </div>
        ) : (
          sortedRouters.map((router) => {
            return (
              <MeshCard
                key={router.nodeId}
                type="router"
                nodeId={router.nodeId}
                nodeData={router}
                onClick={handleNodeClick}
                lastHeard={router.lastHeard}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
