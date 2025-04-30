import React from "react";
import {
  Packet,
  HardwareModel,
  DeviceRole,
  RegionCode,
  ModemPreset,
} from "../../lib/types";
import { Map as MapIcon, MapPin, Network } from "lucide-react";
import { PacketCard } from "./PacketCard";
import { KeyValueGrid, KeyValuePair } from "../ui/KeyValuePair";
import { Map } from "../Map";

interface MapReportPacketProps {
  packet: Packet;
}

// Helper function to get hardware model name
const getHardwareModelName = (
  model: string | HardwareModel | undefined
): string => {
  if (model === undefined) return "Unknown";

  // If it's a string, return it directly
  if (typeof model === "string") return model;

  // If it's an enum value, return the name
  switch (model) {
    case HardwareModel.TBEAM:
      return "T-BEAM";
    case HardwareModel.TBEAM_V0P7:
      return "T-BEAM v0.7";
    case HardwareModel.LILYGO_TBEAM_S3_CORE:
      return "T-BEAM S3";
    case HardwareModel.TLORA_V1:
      return "T-LORA v1";
    case HardwareModel.TLORA_V1_1P3:
      return "T-LORA v1.1.3";
    case HardwareModel.TLORA_V2:
      return "T-LORA v2";
    case HardwareModel.TLORA_V2_1_1P6:
      return "T-LORA v2.1.6";
    case HardwareModel.TLORA_V2_1_1P8:
      return "T-LORA v2.1.8";
    case HardwareModel.TLORA_T3_S3:
      return "T-LORA T3-S3";
    case HardwareModel.T_ECHO:
      return "T-ECHO";
    case HardwareModel.HELTEC_V1:
      return "Heltec v1";
    case HardwareModel.HELTEC_V2_0:
      return "Heltec v2.0";
    case HardwareModel.HELTEC_V2_1:
      return "Heltec v2.1";
    case HardwareModel.RAK4631:
      return "RAK4631";
    case HardwareModel.RAK11200:
      return "RAK11200";
    case HardwareModel.NANO_G1:
      return "Nano G1";
    case HardwareModel.NANO_G1_EXPLORER:
      return "Nano G1 Explorer";
    case HardwareModel.NANO_G2_ULTRA:
      return "Nano G2 Ultra";
    default:
      return `Unknown (${model})`;
  }
};

// Helper function to get role name
const getRoleName = (role: string | DeviceRole | undefined): string => {
  if (role === undefined) return "Unknown";

  // If it's a string, return it directly
  if (typeof role === "string") return role;

  // If it's an enum value, return the name
  switch (role) {
    case DeviceRole.CLIENT:
      return "Client";
    case DeviceRole.ROUTER:
      return "Router";
    case DeviceRole.ROUTER_CLIENT:
      return "Router+Client";
    case DeviceRole.TRACKER:
      return "Tracker";
    case DeviceRole.TAK_TRACKER:
      return "TAK Tracker";
    case DeviceRole.SENSOR:
      return "Sensor";
    case DeviceRole.REPEATER:
      return "Repeater";
    default:
      return `Unknown (${role})`;
  }
};

// Helper function to get region name
const getRegionName = (region: RegionCode | string | undefined): string => {
  if (region === undefined) return "Unknown";

  // Map of region codes to display names
  const regionNames: Record<string, string> = {
    "UNSET": "Unset",
    "US": "US",
    "EU_433": "EU 433MHz",
    "EU_868": "EU 868MHz",
    "CN": "China",
    "JP": "Japan",
    "ANZ": "Australia/NZ",
    "KR": "Korea",
    "TW": "Taiwan",
    "RU": "Russia",
    "IN": "India",
    "NZ_865": "New Zealand 865MHz",
    "TH": "Thailand",
    "LORA_24": "LoRa 2.4GHz",
    "UA_433": "Ukraine 433MHz",
    "UA_868": "Ukraine 868MHz",
    "MY_433": "Malaysia 433MHz"
  };

  // Get the name from the map, or return unknown with the value
  return regionNames[region] || `Unknown (${region})`;
};

// Helper function to get modem preset name
const getModemPresetName = (preset: ModemPreset | string | undefined): string => {
  if (preset === undefined) return "Unknown";

  // Map of modem presets to display names
  const presetNames: Record<string, string> = {
    "UNSET": "Unset",
    "LONG_FAST": "Long Fast",
    "LONG_SLOW": "Long Slow",
    "VERY_LONG_SLOW": "Very Long Slow",
    "MEDIUM_SLOW": "Medium Slow",
    "MEDIUM_FAST": "Medium Fast",
    "SHORT_SLOW": "Short Slow",
    "SHORT_FAST": "Short Fast",
    "ULTRA_FAST": "Ultra Fast"
  };

  // Get the name from the map, or return unknown with the value
  return presetNames[preset] || `Unknown (${preset})`;
};

// Helper function to calculate position accuracy in meters from precision bits
const calculateAccuracyFromPrecisionBits = (precisionBits?: number): number => {
  if (!precisionBits) return 300; // Default accuracy of 300m
  
  // Each precision bit halves the accuracy radius
  // Starting with Earth's circumference (~40075km), calculate the precision
  const earthCircumference = 40075000; // in meters
  const accuracy = earthCircumference / (2 ** precisionBits) / 2;
  
  // Limit to reasonable values
  return Math.max(1, Math.min(accuracy, 10000));
};

export const MapReportPacket: React.FC<MapReportPacketProps> = ({ packet }) => {
  const { data } = packet;
  const mapReport = data.mapReport;

  if (!mapReport) {
    return null;
  }

  // Get the center point for the map based on the MapReport position
  const getMapCenter = () => {
    // Check if the report has a position
    if (mapReport.latitudeI && mapReport.longitudeI) {
      return {
        latitude: mapReport.latitudeI * 1e-7,
        longitude: mapReport.longitudeI * 1e-7,
      };
    }
    return null;
  };

  const center = getMapCenter();
  
  // Get the position precision bits if available
  const precisionBits = mapReport.positionPrecision;
  
  // Calculate position accuracy in meters
  const positionAccuracy = calculateAccuracyFromPrecisionBits(precisionBits);

  return (
    <PacketCard
      packet={packet}
      icon={<MapIcon />}
      iconBgColor="bg-cyan-500"
      label="Map Report"
    >
      <div className="space-y-4">
        {/* MapReport properties */}
        {(mapReport.longName ||
          mapReport.shortName ||
          mapReport.hwModel ||
          mapReport.region ||
          mapReport.modemPreset) && (
          <div className="p-3 bg-neutral-800/50 rounded border border-neutral-700">
            <h3 className="text-sm font-medium text-neutral-300 mb-3 flex items-center">
              <Network className="w-4 h-4 mr-2 text-cyan-400" />
              Report Source
            </h3>

            <KeyValueGrid>
              {mapReport.longName && (
                <KeyValuePair label="Name" value={mapReport.longName} vertical />
              )}
              {mapReport.shortName && (
                <KeyValuePair label="Short Name" value={mapReport.shortName} vertical />
              )}
              {mapReport.hwModel !== undefined && (
                <KeyValuePair
                  label="Hardware"
                  value={getHardwareModelName(mapReport.hwModel)}
                  vertical
                />
              )}
              {mapReport.role !== undefined && (
                <KeyValuePair
                  label="Role"
                  value={getRoleName(mapReport.role)}
                  vertical
                />
              )}
              {mapReport.firmwareVersion && (
                <KeyValuePair
                  label="Firmware"
                  value={mapReport.firmwareVersion}
                  vertical
                  monospace
                />
              )}
              {mapReport.region !== undefined && (
                <KeyValuePair
                  label="Region"
                  value={getRegionName(mapReport.region)}
                  vertical
                />
              )}
              {mapReport.modemPreset !== undefined && (
                <KeyValuePair
                  label="Modem Preset"
                  value={getModemPresetName(mapReport.modemPreset)}
                  vertical
                />
              )}
              {mapReport.numOnlineLocalNodes !== undefined && (
                <KeyValuePair
                  label="Online Nodes"
                  value={mapReport.numOnlineLocalNodes.toString()}
                  vertical
                  monospace
                />
              )}
              {mapReport.hasDefaultChannel !== undefined && (
                <KeyValuePair
                  label="Default Channel"
                  value={mapReport.hasDefaultChannel ? "Yes" : "No"}
                  vertical
                />
              )}
            </KeyValueGrid>
          </div>
        )}

        {center && (
          <div>
            <h3 className="text-sm font-medium text-neutral-300 mb-3 flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-cyan-400" />
              Gateway Location
            </h3>
            <div className="h-[300px] rounded-lg overflow-hidden relative">
              <Map
                latitude={center.latitude}
                longitude={center.longitude}
                width={400}
                height={300}
                flush={true}
                caption="Gateway Location"
                precisionBits={precisionBits}
              />
              {precisionBits !== undefined && (
                <div className="bg-black/60 px-3 py-1 text-xs text-white absolute bottom-0 left-0 right-0">
                  {positionAccuracy < 1000 
                    ? `Location Accuracy: ±${positionAccuracy.toFixed(0)}m`
                    : `Location Accuracy: ±${(positionAccuracy / 1000).toFixed(1)}km`}
                </div>
              )}
            </div>
            {/* Position information */}
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <KeyValuePair 
                label="Coordinates"
                value={`${center.latitude.toFixed(6)}, ${center.longitude.toFixed(6)}`}
                monospace={true}
                inset={true}
              />
              
              {/* Position accuracy (always show, even with default value) */}
              <KeyValuePair 
                label="Accuracy"
                value={positionAccuracy < 1000 
                  ? `±${positionAccuracy.toFixed(0)} m` 
                  : `±${(positionAccuracy / 1000).toFixed(1)} km`}
                monospace={true}
                inset={true}
              />
              
              {mapReport.positionPrecision !== undefined && (
                <KeyValuePair
                  label="Precision"
                  value={`${mapReport.positionPrecision} bits`}
                  monospace={true}
                  inset={true}
                />
              )}
              
              {mapReport.altitude !== undefined && (
                <KeyValuePair
                  label="Altitude"
                  value={`${mapReport.altitude} m`}
                  monospace={true}
                  inset={true}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </PacketCard>
  );
};
