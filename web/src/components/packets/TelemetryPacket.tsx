import React from "react";
import { Packet } from "../../lib/types";
import { BarChart } from "lucide-react";

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
    <div className="p-4 border border-neutral-700 rounded bg-neutral-800 shadow-inner">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <div className="rounded-md bg-amber-500 p-1.5 mr-3">
            <BarChart className="h-4 w-4 text-neutral-100" />
          </div>
          <span className="font-medium text-neutral-200">
            From: {data.from || "Unknown"}
          </span>
        </div>
        <span className="text-neutral-400 text-sm">
          ID: {data.id || "No ID"}
        </span>
      </div>
      
      <div className="mb-3 text-neutral-300 pl-9">
        {renderTelemetryFields()}
      </div>
      
      <div className="mt-3 flex justify-between items-center text-xs text-neutral-500">
        <span>Channel: {packet.info.channel}</span>
        <span>Telemetry</span>
      </div>
    </div>
  );
};