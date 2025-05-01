import React from "react";
import { Packet } from "../../lib/types";
import { BarChart } from "lucide-react";
import { PacketCard } from "./PacketCard";
import { DeviceMetricsPacket } from "./DeviceMetricsPacket";
import { EnvironmentMetricsPacket } from "./EnvironmentMetricsPacket";

interface TelemetryPacketProps {
  packet: Packet;
}

export const TelemetryPacket: React.FC<TelemetryPacketProps> = ({ packet }) => {
  const { data } = packet;
  const telemetry = data.telemetry;
  
  if (!telemetry) {
    return null;
  }
  
  // Determine which type of telemetry we're dealing with
  const hasDeviceMetrics = telemetry.deviceMetrics && Object.keys(telemetry.deviceMetrics).some(
    key => telemetry.deviceMetrics![key as keyof typeof telemetry.deviceMetrics] !== undefined
  );
  
  const hasEnvironmentMetrics = telemetry.environmentMetrics && Object.keys(telemetry.environmentMetrics).some(
    key => telemetry.environmentMetrics![key as keyof typeof telemetry.environmentMetrics] !== undefined
  );
  
  // Use the reception timestamp if available, otherwise fall back to the telemetry time
  const timestamp = data.rxTime || telemetry.time;
  
  // Return the appropriate component based on telemetry type
  if (hasDeviceMetrics && telemetry.deviceMetrics) {
    return (
      <DeviceMetricsPacket 
        packet={packet} 
        metrics={telemetry.deviceMetrics} 
        timestamp={timestamp}
      />
    );
  }
  
  if (hasEnvironmentMetrics && telemetry.environmentMetrics) {
    return (
      <EnvironmentMetricsPacket 
        packet={packet} 
        metrics={telemetry.environmentMetrics} 
        timestamp={timestamp}
      />
    );
  }
  
  // Fallback for unknown telemetry type
  return (
    <PacketCard
      packet={packet}
      icon={<BarChart />}
      iconBgColor="bg-neutral-500"
      label="Unknown Telemetry"
    >
      <div className="text-neutral-400 text-sm">
        Unknown telemetry data received at{' '}
        {timestamp 
          ? new Date(timestamp * 1000).toLocaleTimeString() 
          : 'unknown time'
        }
      </div>
    </PacketCard>
  );
};