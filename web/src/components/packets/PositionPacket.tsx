import React from "react";
import { Packet } from "../../lib/types";
import { MapPin } from "lucide-react";

interface PositionPacketProps {
  packet: Packet;
}

export const PositionPacket: React.FC<PositionPacketProps> = ({ packet }) => {
  const { data } = packet;
  const position = data.position;

  if (!position) {
    return null;
  }
  
  // Convert latitudeI and longitudeI to degrees (multiply by 1e-7)
  const latitude = position.latitudeI ? position.latitudeI * 1e-7 : undefined;
  const longitude = position.longitudeI ? position.longitudeI * 1e-7 : undefined;

  return (
    <div className="p-4 border border-neutral-700 rounded bg-neutral-800 shadow-inner">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <div className="rounded-md bg-emerald-500 p-1.5 mr-3">
            <MapPin className="h-4 w-4 text-neutral-100" />
          </div>
          <span className="font-medium text-neutral-200">
            From: {data.from ? `!${data.from.toString(16).toLowerCase()}` : "Unknown"}
          </span>
        </div>
        <span className="text-neutral-400 text-sm">
          ID: {data.id || "No ID"}
        </span>
      </div>

      <div className="mb-3 text-neutral-300 pl-9">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-neutral-400">Latitude</div>
            <div>{latitude !== undefined ? latitude.toFixed(6) : 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-400">Longitude</div>
            <div>{longitude !== undefined ? longitude.toFixed(6) : 'N/A'}</div>
          </div>
          {position.altitude && (
            <div>
              <div className="text-xs text-neutral-400">Altitude</div>
              <div>{position.altitude.toFixed(1)}m</div>
            </div>
          )}
          {position.time && (
            <div>
              <div className="text-xs text-neutral-400">Time</div>
              <div>{new Date(position.time * 1000).toLocaleTimeString()}</div>
            </div>
          )}
          {position.locationSource && (
            <div>
              <div className="text-xs text-neutral-400">Source</div>
              <div>{position.locationSource.replace('LOC_', '')}</div>
            </div>
          )}
          {position.satsInView && (
            <div>
              <div className="text-xs text-neutral-400">Satellites</div>
              <div>{position.satsInView}</div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex justify-between items-center text-xs text-neutral-500">
        <span>Channel: {packet.info.channel}</span>
        <span>Position</span>
      </div>
    </div>
  );
};
