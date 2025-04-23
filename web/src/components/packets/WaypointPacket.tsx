import React from "react";
import { Packet } from "../../lib/types";
import { MapPin } from "lucide-react";
import { PacketCard } from "./PacketCard";
import { KeyValueGrid, KeyValuePair } from "./KeyValuePair";
import { Map } from "../Map";

interface WaypointPacketProps {
  packet: Packet;
}

export const WaypointPacket: React.FC<WaypointPacketProps> = ({ packet }) => {
  const { data } = packet;
  const waypoint = data.waypoint;

  if (!waypoint) {
    return null;
  }
  
  // Convert coordinates
  const latitude = waypoint.latitudeI ? waypoint.latitudeI * 1e-7 : undefined;
  const longitude = waypoint.longitudeI ? waypoint.longitudeI * 1e-7 : undefined;
  
  // Format expire time if available
  const expireTime = waypoint.expire && waypoint.expire > 0
    ? new Date(waypoint.expire * 1000).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : undefined;
  
  return (
    <PacketCard
      packet={packet}
      icon={<MapPin />}
      iconBgColor="bg-violet-500"
      label="Waypoint"
      backgroundColor="bg-violet-950/5"
    >
      <div className="space-y-4 max-w-full">
        {waypoint.name && (
          <KeyValuePair
            label="Waypoint Name"
            value={waypoint.name}
            large={true}
          />
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <KeyValueGrid>
              {waypoint.id !== undefined && (
                <KeyValuePair
                  label="ID"
                  value={waypoint.id}
                />
              )}
              {latitude !== undefined && (
                <KeyValuePair
                  label="Latitude"
                  value={latitude.toFixed(6)}
                />
              )}
              {longitude !== undefined && (
                <KeyValuePair
                  label="Longitude"
                  value={longitude.toFixed(6)}
                />
              )}
              {expireTime && (
                <KeyValuePair
                  label="Expires"
                  value={expireTime}
                />
              )}
              {waypoint.lockedTo !== undefined && waypoint.lockedTo > 0 && (
                <KeyValuePair
                  label="Locked To"
                  value={`!${waypoint.lockedTo.toString(16)}`}
                />
              )}
            </KeyValueGrid>
            
            {waypoint.description && (
              <div className="mt-4">
                <div className="text-xs text-neutral-400 mb-1">Description</div>
                <div className="text-neutral-300">{waypoint.description}</div>
              </div>
            )}
          </div>
          
          {latitude !== undefined && longitude !== undefined && (
            <div className="h-[240px] w-full rounded-lg overflow-hidden">
              <Map 
                latitude={latitude} 
                longitude={longitude}
                caption={waypoint.name}
                width={400}
                height={240}
                flush={true}
              />
            </div>
          )}
        </div>
      </div>
    </PacketCard>
  );
};