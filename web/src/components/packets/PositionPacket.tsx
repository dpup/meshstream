import React from "react";
import { Packet } from "../../lib/types";
import { MapPin } from "lucide-react";
import { PacketCard } from "./PacketCard";
import { KeyValueGrid, KeyValuePair } from "../ui/KeyValuePair";
import { Map } from "../Map";

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

  // Format time without seconds
  const formattedTime = position.time 
    ? new Date(position.time * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
    : 'N/A';

  return (
    <PacketCard
      packet={packet}
      icon={<MapPin />}
      iconBgColor="bg-emerald-500"
      label="Position"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <KeyValueGrid className="grid-cols-2">
            <KeyValuePair 
              label="Latitude" 
              value={latitude !== undefined ? latitude.toFixed(6) : 'N/A'} 
              vertical
              monospace
            />
            <KeyValuePair 
              label="Longitude" 
              value={longitude !== undefined ? longitude.toFixed(6) : 'N/A'} 
              vertical
              monospace
            />
            {position.altitude && (
              <KeyValuePair 
                label="Altitude" 
                value={`${position.altitude.toFixed(1)}m`} 
                vertical
                monospace
              />
            )}
            {!!position.time && (
              <KeyValuePair 
                label="Time" 
                value={formattedTime} 
                vertical
              />
            )}
            {!!position.locationSource && (
              <KeyValuePair 
                label="Source" 
                value={position.locationSource.replace('LOC_', '')} 
                vertical
              />
            )}
            {!!position.satsInView && (
              <KeyValuePair 
                label="Satellites" 
                value={position.satsInView} 
                vertical
                monospace
                highlight={position.satsInView > 6}
              />
            )}
          </KeyValueGrid>
        </div>
        
        {latitude !== undefined && longitude !== undefined && (
          <div className="h-[240px] w-full rounded-lg overflow-hidden">
            <Map 
              latitude={latitude} 
              longitude={longitude} 
              width={400}
              height={240}
              flush={true}
            />
          </div>
        )}
      </div>
    </PacketCard>
  );
};