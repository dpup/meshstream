import React from "react";
import { Packet, DeviceMetrics } from "../../lib/types";
import { Gauge, Wifi, Clock } from "lucide-react";
import { PacketCard } from "./PacketCard";

interface DeviceMetricsPacketProps {
  packet: Packet;
  metrics: DeviceMetrics;
  timestamp?: number;
}

export const DeviceMetricsPacket: React.FC<DeviceMetricsPacketProps> = ({
  packet,
  metrics,
  timestamp,
}) => {
  // Format uptime in a readable way
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Format time without seconds
  const formattedTime = timestamp
    ? new Date(timestamp * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <PacketCard
      packet={packet}
      icon={<Gauge />}
      iconBgColor="bg-amber-500"
      label="Device Telemetry"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {metrics.batteryLevel !== undefined && (
            <div className="col-span-2">
              <div className="text-xs text-neutral-400 mb-1">Battery</div>
              <div className="w-full h-3 bg-neutral-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    metrics.batteryLevel > 75
                      ? "bg-green-500"
                      : metrics.batteryLevel > 40
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, metrics.batteryLevel)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span
                  className={
                    metrics.batteryLevel > 75
                      ? "text-green-600"
                      : metrics.batteryLevel > 40
                        ? "text-amber-400"
                        : "text-red-400"
                  }
                >
                  {metrics.batteryLevel}%
                </span>
                {metrics.voltage !== undefined && (
                  <span className="text-neutral-500">
                    {metrics.voltage.toFixed(2)}V
                  </span>
                )}
              </div>
            </div>
          )}

          {metrics.channelUtilization !== undefined && (
            <div>
              <div className="flex items-center gap-1.5">
                <Wifi className="h-3 w-3 text-neutral-500" />
                <span className="text-xs text-neutral-400">Channel</span>
              </div>
              <div className="text-sm">
                {metrics.channelUtilization.toFixed(1)}%
              </div>
            </div>
          )}

          {metrics.airUtilTx !== undefined && (
            <div>
              <div className="flex items-center gap-1.5">
                <Wifi className="h-3 w-3 text-neutral-500" />
                <span className="text-xs text-neutral-400">Air TX</span>
              </div>
              <div className="text-sm">{metrics.airUtilTx.toFixed(1)}%</div>
            </div>
          )}

          {metrics.uptimeSeconds !== undefined && (
            <div className="">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-neutral-500" />
                <span className="text-xs text-neutral-400">Uptime</span>
              </div>
              <div className="text-sm">
                {formatUptime(metrics.uptimeSeconds)}
              </div>
            </div>
          )}

          {formattedTime && (
            <div className="">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-neutral-500" />
                <span className="text-xs text-neutral-400">Reported</span>
              </div>
              <div className="text-sm">{formattedTime}</div>
            </div>
          )}
        </div>
      </div>
    </PacketCard>
  );
};
