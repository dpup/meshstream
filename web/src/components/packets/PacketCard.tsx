import React, { ReactNode } from "react";
import { Packet } from "../../lib/types";
import { cn } from "@/lib/cn";

interface PacketCardProps {
  packet: Packet;
  icon: ReactNode;
  iconBgColor: string;
  label: string;
  children: ReactNode;
  backgroundColor?: string;
}

export const PacketCard: React.FC<PacketCardProps> = ({
  packet,
  icon,
  iconBgColor,
  label,
  children,
  backgroundColor = "bg-neutral-500/5",
}) => {
  const { data } = packet;

  return (
    <div className="max-w-4xl effect-inset rounded-lg border border-neutral-950/60 hover:bg-neutral-800 transition-shadow duration-200 overflow-hidden">
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
              })}
            </div>
            <span className="font-semibold text-neutral-200 tracking-wide">
              {data.from
                ? `!${data.from.toString(16).toLowerCase()}`
                : "Unknown"}
            </span>
            <span className="text-neutral-500">on</span>
            <span className="text-neutral-400">{packet.info.channel}</span>
            {data.gatewayId && (
              <>
                <span className="text-neutral-500">via</span>
                <span className="text-neutral-400">{data.gatewayId}</span>
              </>
            )}
          </div>

          {/* Right side: ID, Time, and Type */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center">
              <span className="text-neutral-400">{data.id || "None"}</span>
              {data.rxTime && (
                <span className="text-neutral-500 ml-2">
                  {new Date(data.rxTime * 1000).toLocaleTimeString([], {
                    hour: '2-digit', 
                    minute: '2-digit'
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
