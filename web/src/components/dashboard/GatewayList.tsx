import React from "react";
import { useAppSelector } from "../../hooks";
import { RefreshCw, Signal, MapPin, Thermometer } from "lucide-react";
import { Counter } from "../Counter";

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
          // Format last heard time
          const lastHeardDate = new Date(gateway.lastHeard * 1000);
          const timeString = lastHeardDate.toLocaleTimeString();

          // Determine if gateway is active (heard in last 5 minutes)
          const isActive = Date.now() / 1000 - gateway.lastHeard < 300;

          return (
            <div
              key={gateway.gatewayId}
              className={`flex items-center p-2 rounded-lg ${isActive ? "bg-neutral-800" : "bg-neutral-800/50"}`}
            >
              <div className="mr-2">
                <div
                  className={`p-1.5 rounded-full ${isActive ? "bg-green-900/30 text-green-500" : "bg-neutral-700/30 text-neutral-500"}`}
                >
                  <Signal className="w-4 h-4" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-neutral-200 truncate flex items-center gap-1">
                  {/* Try to find if gateway ID matches a node we know about by its ID */}
                  {(() => {
                    // Extract node ID from gateway ID format if possible
                    const nodeIdMatch =
                      gateway.gatewayId.match(/^!([0-9a-f]+)/i);
                    if (nodeIdMatch) {
                      const nodeIdHex = nodeIdMatch[1];
                      const nodeId = parseInt(nodeIdHex, 16);
                      const matchingNode = nodes[nodeId];

                      if (
                        matchingNode &&
                        (matchingNode.shortName || matchingNode.longName)
                      ) {
                        return (
                          <>
                            <span>
                              {matchingNode.shortName || matchingNode.longName}
                            </span>
                            <span className="text-neutral-500 text-xs">
                              !{nodeIdHex.slice(-4)}
                            </span>
                            {matchingNode.position && (
                              <MapPin className="w-3 h-3 text-blue-400 ml-1" />
                            )}
                            {matchingNode.environmentMetrics && Object.keys(matchingNode.environmentMetrics).length > 0 && (
                              <Thermometer className="w-3 h-3 text-amber-400 ml-1" />
                            )}
                          </>
                        );
                      }
                    }

                    // Default to gateway ID if no match
                    return (
                      <span className="truncate max-w-[160px]">
                        {gateway.gatewayId}
                      </span>
                    );
                  })()}
                </div>
                <div className="text-xs text-neutral-400 flex items-center">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${isActive ? "bg-green-500" : "bg-neutral-500"}`}
                  ></span>
                  {timeString}
                </div>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap flex-shrink-0 ml-1">
                <Counter
                  value={gateway.observedNodes.length}
                  label="nodes"
                  valueColor="text-sky-500"
                  className="mr-1"
                />
                <Counter
                  value={gateway.textMessageCount}
                  label="txt"
                  valueColor="text-teal-500"
                  className="mr-1"
                />
                <Counter
                  value={gateway.messageCount}
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
