import React from "react";
import { Packet } from "../../lib/types";
import { PacketCard } from "./PacketCard";
import { RouteIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface TraceroutePacketProps {
  packet: Packet;
}

export const TraceroutePacket: React.FC<TraceroutePacketProps> = ({ packet }) => {
  const { data } = packet;
  const routeDiscovery = data.routeDiscovery;

  if (!routeDiscovery) {
    return null;
  }

  // Convert a nodenum to hex format for display and linking
  const formatNodeId = (nodeNum: number) => {
    return nodeNum.toString(16).toLowerCase();
  };

  // Renders a node hop with SNR info if available
  const renderHop = (nodeNum: number, index: number, snrValues?: number[]) => {
    const nodeHex = formatNodeId(nodeNum);
    const snr = snrValues && snrValues[index];
    
    return (
      <React.Fragment key={`hop-${index}`}>
        <Link
          to="/node/$nodeId"
          params={{ nodeId: nodeHex }}
          className="text-blue-400 hover:underline"
        >
          !{nodeHex}
        </Link>
        {snr !== undefined && (
          <span className="text-neutral-400 text-xs ml-1">
            ({(snr / 4).toFixed(1)} dB)
          </span>
        )}
        {index < (routeDiscovery.route?.length || 0) - 1 && (
          <span className="mx-2 text-neutral-500">→</span>
        )}
      </React.Fragment>
    );
  };

  return (
    <PacketCard
      packet={packet}
      icon={<RouteIcon />}
      iconBgColor="bg-purple-700"
      label="Traceroute"
    >
      <div className="space-y-6">
        {routeDiscovery.route && routeDiscovery.route.length > 0 && (
          <div>
            <h3 className="text-neutral-300 font-semibold mb-2">Route to destination:</h3>
            <div className="flex flex-wrap items-center text-sm">
              {routeDiscovery.route.map((nodeNum, index) => 
                renderHop(nodeNum, index, routeDiscovery.snrTowards)
              )}
            </div>
          </div>
        )}

        {routeDiscovery.routeBack && routeDiscovery.routeBack.length > 0 && (
          <div>
            <h3 className="text-neutral-300 font-semibold mb-2">Return route:</h3>
            <div className="flex flex-wrap items-center text-sm">
              {routeDiscovery.routeBack.map((nodeNum, index) => 
                renderHop(nodeNum, index, routeDiscovery.snrBack)
              )}
            </div>
          </div>
        )}

        {(!routeDiscovery.route || routeDiscovery.route.length === 0) && 
         (!routeDiscovery.routeBack || routeDiscovery.routeBack.length === 0) && (
          <div className="text-neutral-400">
            No route information available.
          </div>
        )}
      </div>
    </PacketCard>
  );
};