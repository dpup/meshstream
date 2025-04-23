import React from "react";
import { Packet } from "../../lib/types";
import { BarChart } from "lucide-react";
import { PacketCard } from "./PacketCard";
import { KeyValueGrid, KeyValuePair } from "./KeyValuePair";

interface TelemetryPacketProps {
  packet: Packet;
}

export const TelemetryPacket: React.FC<TelemetryPacketProps> = ({ packet }) => {
  const { data } = packet;
  const telemetry = data.telemetry;
  
  if (!telemetry) {
    return null;
  }
  
  // Helper function to render device metrics
  const renderDeviceMetrics = () => {
    if (!telemetry.deviceMetrics) return null;
    
    const metrics = telemetry.deviceMetrics;
    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-neutral-300 mb-2">Device</h4>
        <KeyValueGrid>
          {metrics.batteryLevel !== undefined && (
            <KeyValuePair
              label="Battery"
              value={`${metrics.batteryLevel}%`}
            />
          )}
          {metrics.voltage !== undefined && (
            <KeyValuePair
              label="Voltage"
              value={`${metrics.voltage.toFixed(2)}V`}
            />
          )}
          {metrics.channelUtilization !== undefined && (
            <KeyValuePair
              label="Channel Util."
              value={`${metrics.channelUtilization.toFixed(1)}%`}
            />
          )}
          {metrics.uptimeSeconds !== undefined && (
            <KeyValuePair
              label="Uptime"
              value={formatUptime(metrics.uptimeSeconds)}
            />
          )}
        </KeyValueGrid>
      </div>
    );
  };
  
  // Helper function to render environment metrics
  const renderEnvironmentMetrics = () => {
    if (!telemetry.environmentMetrics) return null;
    
    const metrics = telemetry.environmentMetrics;
    return (
      <div>
        <h4 className="text-sm font-medium text-neutral-300 mb-2">Environment</h4>
        <KeyValueGrid>
          {metrics.temperature !== undefined && (
            <KeyValuePair
              label="Temperature"
              value={`${metrics.temperature.toFixed(1)}°C`}
            />
          )}
          {metrics.relativeHumidity !== undefined && (
            <KeyValuePair
              label="Humidity"
              value={`${metrics.relativeHumidity.toFixed(1)}%`}
            />
          )}
          {metrics.barometricPressure !== undefined && (
            <KeyValuePair
              label="Pressure"
              value={`${(metrics.barometricPressure/100).toFixed(1)} hPa`}
            />
          )}
          {metrics.lux !== undefined && (
            <KeyValuePair
              label="Light"
              value={`${metrics.lux.toFixed(0)} lux`}
            />
          )}
        </KeyValueGrid>
      </div>
    );
  };
  
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
  
  return (
    <PacketCard
      packet={packet}
      icon={<BarChart />}
      iconBgColor="bg-amber-500"
      label="Telemetry"
      backgroundColor="bg-amber-950/5"
    >
      <div className="max-w-md">
        {telemetry.time && (
          <div className="mb-3">
            <KeyValuePair
              label="Time"
              value={new Date(telemetry.time * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            />
          </div>
        )}
        
        {renderDeviceMetrics()}
        {renderEnvironmentMetrics()}
      </div>
    </PacketCard>
  );
};