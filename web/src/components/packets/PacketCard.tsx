import React, { ReactNode } from "react";
import { Packet } from "../../lib/types";
import { cn } from "@/lib/cn";
import { Link } from "@tanstack/react-router";
import { useAppSelector } from "../../hooks";
import { getNodeDisplayName, getGatewayDisplayName } from "../../utils/formatters";

interface PacketCardProps {
  packet: Packet;
  icon: ReactNode;
  iconBgColor: string;
  label: string;
  children: ReactNode;
}

export const PacketCard: React.FC<PacketCardProps> = ({
  packet,
  icon,
  iconBgColor,
  label,
  children,
}) => {
  const { data } = packet;
  const { nodes } = useAppSelector((state) => state.aggregator);
  
  // Get node data for sender and gateway
  const senderNode = data.from ? nodes[data.from] : undefined;
  const gatewayNode = data.gatewayId && data.gatewayId.startsWith('!') 
    ? nodes[parseInt(data.gatewayId.substring(1), 16)]
    : undefined;
  
  // Check if gateway is the same as sender
  const isGatewaySelf = data.from && data.gatewayId && data.gatewayId.startsWith('!') 
    ? data.from === parseInt(data.gatewayId.substring(1), 16)
    : false;

  return (
    <div className="max-w-4xl effect-inset rounded-lg border border-neutral-950/60 bg-neutral-800 overflow-hidden">
      {/* Card Header with all metadata */}
      <div className="p-4 border-b border-neutral-700/50 shadow-inner">
        <div className="flex flex-wrap justify-between items-center gap-2">
          {/* Left side: Icon, From, Channel */}
          <div className="flex items-center text-xs space-x-1">
            <div
              className={cn(
                iconBgColor,
                "p-1.5 rounded-full mr-3 shadow-sm flex-shrink-0"
              )}
            >
              {React.cloneElement(icon as React.ReactElement, {
                className: "h-3.5 w-3.5 text-white",
              } as React.HTMLAttributes<HTMLElement>)}
            </div>
            {data.from ? (
              <Link
                to="/node/$nodeId"
                params={{ nodeId: data.from.toString(16).toLowerCase() }}
                className="font-semibold text-neutral-200 tracking-wide hover:text-blue-400 transition-colors"
              >
                {getNodeDisplayName(data.from, senderNode)}
              </Link>
            ) : (
              <span className="font-semibold text-neutral-200 tracking-wide">Unknown</span>
            )}
            {packet.info.channel && (
              <>
                <span className="text-neutral-500">on</span>
                <span className="text-neutral-400">{packet.info.channel}</span>
              </>
            )}
            {data.gatewayId && (
              <>
                <span className="text-neutral-500">via</span>
                {isGatewaySelf ? (
                  <span className="text-neutral-400">self</span>
                ) : data.gatewayId.startsWith('!') ? (
                  <Link
                    to="/node/$nodeId"
                    params={{ nodeId: data.gatewayId.substring(1) }}
                    className="text-neutral-400 hover:text-blue-400 transition-colors"
                  >
                    {getGatewayDisplayName(data.gatewayId, gatewayNode)}
                  </Link>
                ) : (
                  <span className="text-neutral-400">{data.gatewayId}</span>
                )}
              </>
            )}
          </div>

          {/* Right side: ID, Time, and Type */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center">
              <span className="text-neutral-400">{data.id || ""}</span>
              {data.rxTime && (
                <span className="text-neutral-500 ml-2">
                  {new Date(data.rxTime * 1000).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <span className="px-2 py-0.5 bg-neutral-700/50 text-neutral-300 rounded-full text-xs">
              {label}
            </span>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6 font-mono text-sm">{children}</div>
    </div>
  );
};
