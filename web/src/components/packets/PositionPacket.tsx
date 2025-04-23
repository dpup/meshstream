import React from "react";
import { Packet } from "../../lib/types";
import { MapPin } from "lucide-react";
import { PacketCard } from "./PacketCard";

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
    <PacketCard
      packet={packet}
      icon={<MapPin className="h-4 w-4 text-neutral-100" />}
      iconBgColor="bg-emerald-500"
      label="Position"
    >
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
    </PacketCard>
  );
};
