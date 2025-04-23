import React from "react";
import { Packet } from "../../lib/types";
import { Map as MapIcon } from "lucide-react";
import { PacketCard } from "./PacketCard";
import { KeyValueGrid, KeyValuePair } from "./KeyValuePair";
import { Map } from "../Map";

interface MapReportPacketProps {
  packet: Packet;
}

export const MapReportPacket: React.FC<MapReportPacketProps> = ({ packet }) => {
  const { data } = packet;
  const mapReport = data.mapReport;

  if (!mapReport || !mapReport.nodes || mapReport.nodes.length === 0) {
    return null;
  }
  
  // Get the center point for the map (average of all node positions)
  const getMapCenter = () => {
    let validPositions = 0;
    let sumLat = 0;
    let sumLng = 0;
    
    mapReport.nodes.forEach(node => {
      if (node.position && node.position.latitudeI && node.position.longitudeI) {
        sumLat += node.position.latitudeI * 1e-7;
        sumLng += node.position.longitudeI * 1e-7;
        validPositions++;
      }
    });
    
    if (validPositions > 0) {
      return {
        latitude: sumLat / validPositions,
        longitude: sumLng / validPositions,
      };
    }
    
    return null;
  };
  
  const center = getMapCenter();
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <PacketCard
      packet={packet}
      icon={<MapIcon />}
      iconBgColor="bg-cyan-500"
      label="Map Report"
      backgroundColor="bg-cyan-950/5"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-neutral-300 mb-3">
              Network Map ({mapReport.nodes.length} Nodes)
            </h3>
            
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
              {mapReport.nodes.map((node, index) => (
                <div 
                  key={node.num || index} 
                  className="p-3 bg-neutral-800/50 rounded border border-neutral-700"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-neutral-200">
                      {node.user?.longName || `Node ${node.num?.toString(16)}`}
                    </div>
                    {node.lastHeard && (
                      <div className="text-xs text-neutral-400">
                        {formatTimestamp(node.lastHeard)}
                      </div>
                    )}
                  </div>
                  
                  <KeyValueGrid>
                    {node.user?.shortName && (
                      <KeyValuePair
                        label="Short Name"
                        value={node.user.shortName}
                      />
                    )}
                    {node.num !== undefined && (
                      <KeyValuePair
                        label="Node ID"
                        value={`!${node.num.toString(16)}`}
                      />
                    )}
                    {node.user?.hwModel && (
                      <KeyValuePair
                        label="Hardware"
                        value={node.user.hwModel}
                      />
                    )}
                    {node.snr !== undefined && (
                      <KeyValuePair
                        label="SNR"
                        value={`${node.snr.toFixed(1)} dB`}
                      />
                    )}
                    {node.position?.latitudeI && node.position?.longitudeI && (
                      <>
                        <KeyValuePair
                          label="Latitude"
                          value={(node.position.latitudeI * 1e-7).toFixed(6)}
                        />
                        <KeyValuePair
                          label="Longitude"
                          value={(node.position.longitudeI * 1e-7).toFixed(6)}
                        />
                      </>
                    )}
                  </KeyValueGrid>
                </div>
              ))}
            </div>
          </div>
          
          {center && (
            <div className="h-[300px] w-full rounded-lg overflow-hidden">
              <Map 
                latitude={center.latitude} 
                longitude={center.longitude}
                zoom={12}
                width={400}
                height={300}
                flush={true}
                caption="Network Overview"
              />
            </div>
          )}
        </div>
      </div>
    </PacketCard>
  );
};