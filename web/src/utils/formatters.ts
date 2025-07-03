import { RegionCode, ModemPreset } from "../lib/types";
import { NodeData } from "../store/slices/aggregatorSlice";

/**
 * Format uptime into a human-readable string
 */
export const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(" ") || "< 1m";
};

/**
 * Get region name from region code
 */
export const getRegionName = (region: RegionCode | string | undefined): string => {
  if (region === undefined) return "Unknown";

  // Map of region codes to display names
  const regionNames: Record<string, string> = {
    UNSET: "Unset",
    US: "US",
    EU_433: "EU 433MHz",
    EU_868: "EU 868MHz",
    CN: "China",
    JP: "Japan",
    ANZ: "Australia/NZ",
    KR: "Korea",
    TW: "Taiwan",
    RU: "Russia",
    IN: "India",
    NZ_865: "New Zealand 865MHz",
    TH: "Thailand",
    LORA_24: "LoRa 2.4GHz",
    UA_433: "Ukraine 433MHz",
    UA_868: "Ukraine 868MHz",
    MY_433: "Malaysia 433MHz",
  };

  // Get the name from the map, or return unknown with the value
  return regionNames[region] || `Unknown (${region})`;
};

/**
 * Get modem preset name from preset code
 */
export const getModemPresetName = (
  preset: ModemPreset | string | undefined
): string => {
  if (preset === undefined) return "Unknown";

  // Map of modem presets to display names
  const presetNames: Record<string, string> = {
    UNSET: "Unset",
    LONG_FAST: "Long Fast",
    LONG_SLOW: "Long Slow",
    VERY_LONG_SLOW: "Very Long Slow",
    MEDIUM_SLOW: "Medium Slow",
    MEDIUM_FAST: "Medium Fast",
    SHORT_SLOW: "Short Slow",
    SHORT_FAST: "Short Fast",
    ULTRA_FAST: "Ultra Fast",
  };

  // Get the name from the map, or return unknown with the value
  return presetNames[preset] || `Unknown (${preset})`;
};

/**
 * Get the display name for a node, preferring shortName over longName, with fallback to hex ID
 */
export const getNodeDisplayName = (
  nodeId: number,
  nodeData?: NodeData
): string => {
  if (nodeData?.shortName) {
    return nodeData.shortName;
  }
  
  if (nodeData?.longName) {
    return nodeData.longName;
  }
  
  // Fallback to hex ID format
  return `!${nodeId.toString(16).toLowerCase()}`;
};

/**
 * Get the display name for a gateway ID, with optional node data lookup
 */
export const getGatewayDisplayName = (
  gatewayId: string,
  nodeData?: NodeData
): string => {
  if (nodeData?.shortName) {
    return nodeData.shortName;
  }
  
  if (nodeData?.longName) {
    return nodeData.longName;
  }
  
  // Return the gateway ID as-is (already in !hex format)
  return gatewayId;
};