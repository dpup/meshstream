import React, { ReactNode } from "react";
import { Packet } from "../../lib/types";

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

  return (
    <div className="max-w-4xl p-4 effect-inset bg-neutral-500/5 rounded-lg border border-neutral-950/60">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <div className={`rounded-md ${iconBgColor} p-1.5 mr-3`}>{icon}</div>
          <span className="font-medium text-neutral-200">
            From:{" "}
            {data.from ? `!${data.from.toString(16).toLowerCase()}` : "Unknown"}
          </span>
        </div>
        <span className="text-neutral-400 text-sm">
          ID: {data.id || "No ID"}
        </span>
      </div>

      <div className="mb-3 text-neutral-300 pl-9">{children}</div>

      <div className="mt-3 flex justify-between items-center text-xs text-neutral-500">
        <span>Channel: {packet.info.channel}</span>
        <span>{label}</span>
      </div>
    </div>
  );
};
