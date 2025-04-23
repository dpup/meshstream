import React from "react";
import { Packet } from "../../lib/types";
import { BarChart } from "lucide-react";
import { PacketCard } from "./PacketCard";

interface TelemetryPacketProps {
  packet: Packet;
}

export const TelemetryPacket: React.FC<TelemetryPacketProps> = ({ packet }) => {
  const { data } = packet;
  const telemetry = data.telemetry;
  
  if (!telemetry) {
    return null;
  }
  
  // Helper function to display telemetry fields
  const renderTelemetryFields = () => {
    const entries = Object.entries(telemetry).filter(([key]) => key !== 'time');
    
    if (entries.length === 0) {
      return <div>No telemetry data available</div>;
    }
    
    return (
      <div className="grid grid-cols-2 gap-2">
        {entries.map(([key, value]) => (
          <div key={key}>
            <div className="text-xs text-neutral-400">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
            <div>{typeof value === 'number' ? value.toFixed(2) : String(value)}</div>
          </div>
        ))}
        
        {telemetry.time && (
          <div className="col-span-2">
            <div className="text-xs text-neutral-400">Time</div>
            <div>{new Date(telemetry.time * 1000).toLocaleString()}</div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <PacketCard
      packet={packet}
      icon={<BarChart className="h-4 w-4 text-neutral-100" />}
      iconBgColor="bg-amber-500"
      label="Telemetry"
    >
      {renderTelemetryFields()}
    </PacketCard>
  );
};