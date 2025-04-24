import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppSelector } from "../../hooks";
import { Radio, Battery, RefreshCw, MapPin, Thermometer } from "lucide-react";
import { Counter } from "../Counter";

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
          // Format last heard time
          const lastHeardDate = new Date(node.lastHeard * 1000);
          const timeString = lastHeardDate.toLocaleTimeString();
          const dateString = lastHeardDate.toLocaleDateString();

          // Calculate time since last heard (in seconds)
          const secondsSinceLastHeard = Date.now() / 1000 - node.lastHeard;

          // Determine node activity status:
          // Recent: < 10 minutes (green)
          // Active: 10-30 minutes (blue)
          // Inactive: > 30 minutes (grey)
          const isRecent = secondsSinceLastHeard < 600; // 10 minutes
          const isActive = !isRecent && secondsSinceLastHeard < 1800; // 10-30 minutes

          return (
            <div
              key={node.nodeId}
              onClick={() => handleNodeClick(node.nodeId)}
              className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                isRecent
                  ? "bg-neutral-800 hover:bg-neutral-700"
                  : isActive
                    ? "bg-neutral-800/80 hover:bg-neutral-700/80"
                    : "bg-neutral-800/50 hover:bg-neutral-800"
              }`}
            >
              <div className="mr-2">
                <div
                  className={`p-1.5 rounded-full ${
                    isRecent
                      ? "bg-green-900/30 text-green-500"
                      : isActive
                        ? "bg-green-900/50 text-green-700"
                        : "bg-neutral-700/30 text-neutral-500"
                  }`}
                >
                  <Radio className="w-4 h-4" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-neutral-200 truncate flex items-center gap-1">
                  {node.shortName || node.longName ? (
                    <>
                      <span>{node.shortName || node.longName}</span>
                      <span className="text-neutral-500 text-xs">
                        !{node.nodeId.toString(16).slice(-4)}
                      </span>
                    </>
                  ) : (
                    <span>!{node.nodeId.toString(16)}</span>
                  )}
                  {node.position && (
                    <MapPin className="w-3 h-3 text-blue-400 ml-1" />
                  )}
                  {node.environmentMetrics && Object.keys(node.environmentMetrics).length > 0 && (
                    <Thermometer className="w-3 h-3 text-amber-400 ml-1" />
                  )}
                </div>
                <div className="text-xs text-neutral-400 flex items-center">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                      isRecent
                        ? "bg-green-500"
                        : isActive
                          ? "bg-green-700"
                          : "bg-neutral-500"
                    }`}
                  ></span>
                  {timeString}
                </div>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap flex-shrink-0">
                {node.batteryLevel !== undefined && (
                  <div className="flex items-center text-xs">
                    <Battery className="w-3.5 h-3.5 mr-0.5" />
                    <span
                      className={
                        node.batteryLevel > 30
                          ? "text-green-500"
                          : "text-amber-500"
                      }
                    >
                      {node.batteryLevel}%
                    </span>
                  </div>
                )}
                <Counter
                  value={node.textMessageCount}
                  label="txt"
                  valueColor="text-teal-500"
                  className="mr-1"
                />
                <Counter
                  value={node.messageCount}
                  label="pkts"
                  valueColor="text-amber-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
