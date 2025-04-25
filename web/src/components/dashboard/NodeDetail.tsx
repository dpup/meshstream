import React, { useEffect, useRef } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useAppSelector, useAppDispatch } from "../../hooks";
import { selectNode } from "../../store/slices/aggregatorSlice";
import { RegionCode, ModemPreset } from "../../lib/types";
import { KeyValuePair } from "../ui/KeyValuePair";
import { Separator } from "../Separator";
import {
  ArrowLeft,
  Radio,
  Cpu,
  Thermometer,
  Gauge,
  Signal,
  Droplets,
  Map,
  Calendar,
  Clock,
  Wifi,
  BarChart,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  AlertTriangle,
  Zap,
  Timer,
  ChevronRight,
  Users,
  Earth,
  TableConfig,
  Save,
} from "lucide-react";

interface NodeDetailProps {
  nodeId: number;
}

// Function to calculate the position accuracy in meters using precision bits
const calculateAccuracyFromPrecisionBits = (precisionBits?: number): number => {
  if (!precisionBits) return 300; // Default accuracy of 300m

  // Each precision bit halves the accuracy radius
  // Starting with Earth's circumference (~40075km), calculate the precision
  // For reference: 24 bits = ~2.4m accuracy, 21 bits = ~19m accuracy
  const earthCircumference = 40075000; // in meters
  const accuracy = earthCircumference / 2 ** precisionBits / 2;

  // Limit to reasonable values
  return Math.max(1, Math.min(accuracy, 10000));
};

// Calculate appropriate zoom level based on accuracy
const calculateZoomFromAccuracy = (accuracyMeters: number): number => {
  // Roughly map accuracy to zoom level (higher accuracy = higher zoom)
  // < 10m: zoom 18
  // < 50m: zoom 16
  // < 100m: zoom 15
  // < 500m: zoom 14
  // < 1km: zoom 13
  // < 5km: zoom 11
  // >= 5km: zoom 10
  if (accuracyMeters < 10) return 18;
  if (accuracyMeters < 50) return 16;
  if (accuracyMeters < 100) return 15;
  if (accuracyMeters < 500) return 14;
  if (accuracyMeters < 1000) return 13;
  if (accuracyMeters < 5000) return 11;
  return 10;
};

// Google Maps component that uses the API loaded via script tag
const GoogleMap: React.FC<{
  lat: number;
  lng: number;
  zoom?: number;
  precisionBits?: number;
}> = ({ lat, lng, zoom, precisionBits }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Calculate accuracy in meters based on precision bits
  const accuracyMeters = calculateAccuracyFromPrecisionBits(precisionBits);

  // If zoom is not provided, calculate based on accuracy
  const effectiveZoom = zoom || calculateZoomFromAccuracy(accuracyMeters);

  useEffect(() => {
    if (mapRef.current && window.google && window.google.maps) {
      // Create map instance
      const mapOptions: google.maps.MapOptions = {
        center: { lat, lng },
        zoom: effectiveZoom,
        mapTypeId: google.maps.MapTypeId.HYBRID,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          {
            featureType: "all",
            elementType: "labels.text.fill",
            stylers: [{ color: "#ffffff" }],
          },
          {
            featureType: "all",
            elementType: "labels.text.stroke",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "administrative",
            elementType: "geometry",
            stylers: [{ visibility: "on" }, { color: "#2d2d2d" }],
          },
          {
            featureType: "landscape",
            elementType: "geometry",
            stylers: [{ color: "#1a1a1a" }],
          },
          {
            featureType: "poi",
            elementType: "geometry",
            stylers: [{ color: "#1a1a1a" }],
          },
          {
            featureType: "road",
            elementType: "geometry.fill",
            stylers: [{ color: "#2d2d2d" }],
          },
          {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#333333" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#0f252e" }],
          },
        ],
      };

      mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions);

      // Only add the center marker if we don't have precision information or
      // it's very accurate.
      if (precisionBits === undefined || accuracyMeters < 100) {
        markerRef.current = new google.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          title: `Node Position`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#4ade80",
            fillOpacity: 1,
            strokeColor: "#22c55e",
            strokeWeight: 2,
          },
        });
      }

      // Circle will always be shown, using default 300m accuracy if no
      // precision bits.
      new google.maps.Circle({
        strokeColor: "#22c55e",
        strokeOpacity: 0.8,
        strokeWeight: 2.5,
        fillColor: "#4ade80",
        fillOpacity: 0.4,
        map: mapInstanceRef.current,
        center: { lat, lng },
        radius: accuracyMeters,
      });
    }
  }, [lat, lng, effectiveZoom, accuracyMeters]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full min-h-[300px] rounded-lg overflow-hidden effect-inset"
    />
  );
};

// Battery level component with visual indicator
const BatteryLevel: React.FC<{ level: number }> = ({ level }) => {
  let color = "bg-green-500";
  let icon = <BatteryFull className="w-4 h-4" />;

  if (level <= 20) {
    color = "bg-red-500";
    icon = <BatteryLow className="w-4 h-4" />;
  } else if (level <= 50) {
    color = "bg-amber-500";
    icon = <BatteryMedium className="w-4 h-4" />;
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="text-neutral-400 flex items-center">
          {icon}
          <span className="ml-1.5">Battery</span>
        </span>
        <span
          className={`${level > 30 ? "text-green-500" : "text-amber-500"} font-mono text-sm`}
        >
          {level}%
        </span>
      </div>
      <div className="w-full bg-neutral-700/70 rounded-full h-2 effect-inset">
        <div
          className={`${color} h-2 rounded-full`}
          style={{ width: `${level}%` }}
        ></div>
      </div>
    </div>
  );
};

// Signal strength component with visual indicator
const SignalStrength: React.FC<{ snr: number }> = ({ snr }) => {
  // SNR is typically in dB, with values from -20 to +20
  // Higher is better: < 0 is poor, > 10 is excellent
  let strengthClass = "bg-red-500";
  let strengthText = "Poor";
  let textColor = "text-red-500";

  if (snr > 10) {
    strengthClass = "bg-green-500";
    strengthText = "Excellent";
    textColor = "text-green-500";
  } else if (snr > 5) {
    strengthClass = "bg-green-400";
    strengthText = "Good";
    textColor = "text-green-400";
  } else if (snr > 0) {
    strengthClass = "bg-amber-500";
    strengthText = "Fair";
    textColor = "text-amber-500";
  }

  // Calculate width percentage (0-100%)
  // Map SNR from -20...+20 to 0...100%
  const percentage = Math.max(0, Math.min(100, ((snr + 20) / 40) * 100));

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="text-neutral-400 flex items-center">
          <Signal className="w-4 h-4" />
          <span className="ml-1.5">Signal</span>
        </span>
        <span className="flex items-center">
          <span className="font-mono text-sm">{snr} dB</span>
          <span className={`${textColor} text-xs ml-1.5`}>
            ({strengthText})
          </span>
        </span>
      </div>
      <div className="w-full bg-neutral-700/70 rounded-full h-2 effect-inset">
        <div
          className={`${strengthClass} h-2 rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// Section component for consistent section styling
const Section: React.FC<{
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, children, className = "" }) => {
  return (
    <div
      className={`bg-neutral-800/50 p-4 rounded-lg effect-inset ${className}`}
    >
      <h2 className="font-semibold mb-4 text-neutral-300 border-b border-neutral-700 pb-2 flex items-center">
        {icon && <span className="mr-2">{icon}</span>}
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
};

// Use the new centralized KeyValuePair component from ui folder

// Format uptime into a human-readable string
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(" ") || "< 1m";
};

// Helper function to get region name
const getRegionName = (region: RegionCode | string | undefined): string => {
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

// Helper function to get modem preset name
const getModemPresetName = (
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

export const NodeDetail: React.FC<NodeDetailProps> = ({ nodeId }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { nodes, gateways } = useAppSelector((state) => state.aggregator);

  // First try to get the node directly from nodes collection
  let node = nodes[nodeId];

  // If node not found in nodes collection, check if it might be a gateway
  if (!node) {
    // Construct the gateway ID format from the node ID
    const gatewayId = `!${nodeId.toString(16).toLowerCase()}`;

    // Check if there's a gateway with this ID
    const gateway = gateways[gatewayId];

    if (gateway) {
      // Create a synthetic node from the gateway data
      node = {
        nodeId,
        lastHeard: gateway.lastHeard,
        messageCount: gateway.messageCount,
        textMessageCount: gateway.textMessageCount,
        // Mark this as a gateway node
        isGateway: true,
        gatewayId: gatewayId,
        // Add observed nodes info
        observedNodeCount: gateway.observedNodes.length,
      };

      // Look for packets from this node that might have MapReport data
      // No direct access to packets store here, so we'll rely on
      // the data being properly populated in the aggregatorSlice
    }
  }

  useEffect(() => {
    // Update selected node in the store
    dispatch(selectNode(nodeId));

    // Clear selection when component unmounts
    return () => {
      dispatch(selectNode(undefined));
    };
  }, [dispatch, nodeId]);

  const handleBack = () => {
    navigate({ to: "/" });
  };

  if (!node) {
    return (
      <div className="p-6 text-red-400 border border-red-900 rounded bg-neutral-900 effect-inset">
        <div className="flex items-center mb-3">
          <button
            onClick={handleBack}
            className="flex items-center mr-3 px-2 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 rounded transition-colors effect-inset"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
          <h1 className="text-xl font-semibold">Node Not Found</h1>
        </div>
        <p>The node with ID {nodeId} was not found or has not been seen yet.</p>
      </div>
    );
  }

  // Format node name
  const nodeName =
    node.shortName ||
    node.longName ||
    `${node.isGateway ? "Gateway" : "Node"} ${nodeId.toString(16)}`;

  // Format timestamps
  const lastHeardDate = new Date(node.lastHeard * 1000);
  const lastHeardTime = lastHeardDate.toLocaleTimeString();
  const lastHeardDay = lastHeardDate.toLocaleDateString();

  // Calculate how recently node was active
  const secondsAgo = Math.floor(Date.now() / 1000) - node.lastHeard;
  const minutesAgo = Math.floor(secondsAgo / 60);
  const hoursAgo = Math.floor(minutesAgo / 60);
  const daysAgo = Math.floor(hoursAgo / 24);

  let lastSeenText = "";
  if (secondsAgo < 60) {
    lastSeenText = `${secondsAgo} seconds ago`;
  } else if (minutesAgo < 60) {
    lastSeenText = `${minutesAgo} minute${minutesAgo > 1 ? "s" : ""} ago`;
  } else if (hoursAgo < 24) {
    lastSeenText = `${hoursAgo} hour${hoursAgo > 1 ? "s" : ""} ago`;
  } else {
    lastSeenText = `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`;
  }

  // Is node active
  const isActive = secondsAgo < 600; // 10 minutes

  // Get position data if available
  const hasPosition =
    node.position &&
    node.position.latitudeI !== undefined &&
    node.position.longitudeI !== undefined;

  const latitude = hasPosition ? node.position!.latitudeI! / 10000000 : 0;
  const longitude = hasPosition ? node.position!.longitudeI! / 10000000 : 0;

  // Get precision bits from either the position or the mapReport (for gateways)
  let precisionBits: number | undefined;

  // For regular nodes, get from position
  if (node.position?.precisionBits !== undefined) {
    precisionBits = node.position.precisionBits;
  }
  // For gateways with a mapReport, get from positionPrecision
  else if (node.isGateway && node.mapReport?.positionPrecision !== undefined) {
    precisionBits = node.mapReport.positionPrecision;
  }

  // Calculate position accuracy in meters
  const positionAccuracy = calculateAccuracyFromPrecisionBits(precisionBits);

  return (
    <div>
      {/* Header with back button and basic node info */}
      <div className="flex items-center p-4 bg-neutral-800/50 rounded-lg">
        <button
          onClick={handleBack}
          className="flex items-center mr-4 p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 rounded-full transition-colors effect-outset"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div
          className={`p-2 mr-3 rounded-full ${isActive ? "bg-green-900/30 text-green-500" : "bg-neutral-700/30 text-neutral-500"} effect-inset`}
        >
          {node.isGateway ? (
            <Signal className="w-4 h-4" />
          ) : (
            <Radio className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1 flex flex-col md:flex-row md:items-center">
          <h1 className="text-xl font-semibold text-neutral-200 mr-3">
            {nodeName}
          </h1>
          <div className="text-sm text-neutral-400 flex items-center">
            <span
              className={`inline-block w-2 h-2 rounded-full mr-2 ${isActive ? "bg-green-500" : "bg-neutral-500"}`}
            ></span>
            {isActive ? "Active" : "Inactive"} - last seen {lastSeenText}
          </div>
        </div>
        <div className="text-sm bg-neutral-900/50 px-3 py-1.5 rounded font-mono text-green-400 effect-inset tracking-wider">
          !{nodeId.toString(16)}
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Basic Info */}
            <Section
              title="Device Information"
              icon={<Cpu className="w-4 h-4" />}
            >
              {node.longName && (
                <KeyValuePair label="Name" value={node.longName} inset={true} />
              )}

              {node.hwModel && (
                <KeyValuePair
                  label="Hardware"
                  value={node.hwModel}
                  icon={<Cpu className="w-3 h-3" />}
                  inset={true}
                />
              )}

              {node.macAddr && (
                <KeyValuePair
                  label="MAC Address"
                  value={node.macAddr}
                  monospace={true}
                  inset={true}
                />
              )}

              <div className="flex justify-between items-center bg-neutral-700/50 p-2 rounded effect-inset">
                <span className="text-neutral-400 flex items-center text-sm">
                  <Wifi className="w-3 h-3 mr-2 text-neutral-300" />
                  Channels
                </span>
                <div className="flex flex-col items-end">
                  {node.channelId ? (
                    <Link
                      to="/channel/$channelId"
                      params={{ channelId: node.channelId }}
                      className="text-neutral-200 flex items-center hover:text-blue-400 transition-colors"
                    >
                      <Wifi className="w-3 h-3 mr-1.5 text-blue-400" />
                      <span className="font-mono text-sm">
                        {node.channelId}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-neutral-400 italic">
                      None detected
                    </span>
                  )}
                  {node.mapReport?.hasDefaultChannel !== undefined && (
                    <span className="text-xs text-neutral-400">
                      Default channel:{" "}
                      {node.mapReport.hasDefaultChannel ? "Yes" : "No"}
                    </span>
                  )}
                </div>
              </div>

              {/* Show MapReport-specific information for gateways */}
              {node.isGateway && (
                <div className="mt-4 pt-3 border-t border-neutral-700 space-y-3">
                  <div className="flex justify-between items-center mb-2 bg-blue-900/20 p-2 rounded effect-inset">
                    <span className="text-blue-400 flex items-center">
                      <Signal className="w-4 h-4 mr-1.5" />
                      Gateway Node
                    </span>
                    {node.observedNodeCount !== undefined && (
                      <span className="text-blue-400 flex items-center">
                        <Users className="w-4 h-4 mr-1.5" />
                        {node.observedNodeCount}{" "}
                        {node.observedNodeCount === 1 ? "node" : "nodes"}
                      </span>
                    )}
                    {node.mapReport?.numOnlineLocalNodes !== undefined && (
                      <span className="text-emerald-400 text-xs flex items-center font-mono">
                        {node.mapReport.numOnlineLocalNodes} online local nodes
                      </span>
                    )}
                  </div>
                  {node.mapReport?.region !== undefined && (
                    <KeyValuePair
                      label="Region"
                      value={getRegionName(node.mapReport.region)}
                      icon={<Earth className="w-3 h-3" />}
                      inset={true}
                    />
                  )}

                  {node.mapReport?.modemPreset !== undefined && (
                    <KeyValuePair
                      label="Modem Preset"
                      value={getModemPresetName(node.mapReport.modemPreset)}
                      icon={<TableConfig className="w-3 h-3" />}
                      inset={true}
                    />
                  )}

                  {node.mapReport?.firmwareVersion && (
                    <KeyValuePair
                      label="Firmware"
                      value={node.mapReport.firmwareVersion}
                      monospace={true}
                      icon={<Save className="w-3 h-3" />}
                      inset={true}
                    />
                  )}
                </div>
              )}
            </Section>

            {/* Activity */}
            <Section title="Last Activity" icon={<Clock className="w-4 h-4" />}>
              <KeyValuePair
                label="Date"
                value={lastHeardDay}
                icon={<Calendar className="w-3 h-3" />}
                monospace={true}
                inset={true}
              />

              <KeyValuePair
                label="Time"
                value={lastHeardTime}
                icon={<Clock className="w-3 h-3" />}
                monospace={true}
                inset={true}
              />

              {node.deviceMetrics?.uptimeSeconds !== undefined && (
                <KeyValuePair
                  label="Uptime"
                  value={formatUptime(node.deviceMetrics.uptimeSeconds)}
                  icon={<Timer className="w-3 h-3" />}
                  monospace={true}
                  highlight={node.deviceMetrics.uptimeSeconds > 86400}
                  inset={true}
                />
              )}

              <div className="flex justify-between items-center bg-neutral-700/50 p-2 rounded effect-inset">
                <span className="text-neutral-400 flex items-center text-sm">
                  <Signal className="w-3 h-3 mr-2 text-neutral-300" />
                  Gateways
                </span>
                <div className="flex flex-col items-end">
                  {node.gatewayId ? (
                    // Check if gateway ID matches the current node ID (self-reporting)
                    node.gatewayId ===
                    `!${nodeId.toString(16).toLowerCase()}` ? (
                      <span className="text-emerald-400 text-xs flex items-center font-mono">
                        Self reported
                      </span>
                    ) : (
                      <Link
                        to="/node/$nodeId"
                        params={{ nodeId: node.gatewayId.substring(1) }}
                        className="font-mono text-xs truncate max-w-[180px] text-blue-400 hover:text-blue-300 transition-colors flex items-center"
                      >
                        {node.gatewayId}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Link>
                    )
                  ) : (
                    <span className="text-neutral-400 italic">
                      None detected
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-neutral-700/50 effect-inset">
                <span className="text-neutral-400 flex items-center text-sm">
                  <Radio className="w-3 h-3 mr-2 text-neutral-300" />
                  Packets
                </span>
                <div className="flex space-x-3">
                  <div className="flex flex-col items-center">
                    <span className="text-amber-500 font-mono text-lg">
                      {node.messageCount}
                    </span>
                    <span className="text-xs text-neutral-500">Total</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-green-500 font-mono text-lg">
                      {node.textMessageCount}
                    </span>
                    <span className="text-xs text-neutral-500">Text</span>
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* Position Map */}
          {hasPosition && (
            <Section
              title="Node Location"
              icon={<Map className="w-4 h-4" />}
              className="mt-4"
            >
              <div className="h-[350px] rounded-lg overflow-hidden relative shadow-inner">
                <GoogleMap
                  lat={latitude}
                  lng={longitude}
                  precisionBits={precisionBits}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3 text-sm">
                <KeyValuePair
                  label="Coordinates"
                  value={`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
                  monospace={true}
                  inset={true}
                />

                {node.position?.altitude !== undefined && (
                  <KeyValuePair
                    label="Altitude"
                    value={`${node.position.altitude} m`}
                    monospace={true}
                    inset={true}
                  />
                )}

                {/* Position Accuracy */}
                <KeyValuePair
                  label="Accuracy"
                  value={
                    positionAccuracy < 1000
                      ? `±${positionAccuracy.toFixed(0)} m`
                      : `±${(positionAccuracy / 1000).toFixed(1)} km`
                  }
                  monospace={true}
                  inset={true}
                />

                {precisionBits !== undefined && (
                  <KeyValuePair
                    label="Precision"
                    value={`${precisionBits} bits`}
                    monospace={true}
                    inset={true}
                  />
                )}

                {node.position?.satsInView !== undefined && (
                  <KeyValuePair
                    label="Satellites"
                    value={node.position.satsInView}
                    monospace={true}
                    highlight={node.position.satsInView > 6}
                    inset={true}
                  />
                )}

                {node.position?.groundSpeed !== undefined && (
                  <KeyValuePair
                    label="Speed"
                    value={`${node.position.groundSpeed} m/s`}
                    monospace={true}
                    inset={true}
                  />
                )}
              </div>
            </Section>
          )}
        </div>

        <div className="space-y-6">
          {/* Telemetry Info - Device Metrics */}
          {(node.deviceMetrics ||
            node.batteryLevel !== undefined ||
            node.snr !== undefined) && (
            <Section title="Device Status" icon={<Cpu className="w-4 h-4" />}>
              <div className="space-y-4">
                {node.batteryLevel !== undefined && (
                  <BatteryLevel level={node.batteryLevel} />
                )}

                {node.deviceMetrics?.voltage !== undefined && (
                  <KeyValuePair
                    label="Voltage"
                    value={`${node.deviceMetrics.voltage.toFixed(2)} V`}
                    icon={<Zap className="w-3 h-3" />}
                    monospace={true}
                    highlight={node.deviceMetrics.voltage > 3.7}
                    inset={true}
                  />
                )}

                {node.snr !== undefined && <SignalStrength snr={node.snr} />}

                {(node.deviceMetrics?.channelUtilization !== undefined ||
                  node.deviceMetrics?.airUtilTx !== undefined) && (
                  <div className="mt-3 pt-3 border-t border-neutral-700">
                    <div className="text-sm text-neutral-400 mb-2 flex items-center">
                      <BarChart className="w-3 h-3 mr-1.5" />
                      Channel Utilization:
                    </div>

                    {node.deviceMetrics?.channelUtilization !== undefined && (
                      <div className="flex flex-col mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Total</span>
                          <span className="font-mono">
                            {node.deviceMetrics.channelUtilization}%
                          </span>
                        </div>
                        <div className="w-full bg-neutral-700/70 rounded-full h-2 effect-inset">
                          <div
                            className={`bg-blue-500 h-2 rounded-full`}
                            style={{
                              width: `${node.deviceMetrics.channelUtilization}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {node.deviceMetrics?.airUtilTx !== undefined && (
                      <div className="flex flex-col">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Transmit</span>
                          <span className="font-mono">
                            {node.deviceMetrics.airUtilTx}%
                          </span>
                        </div>
                        <div className="w-full bg-neutral-700/70 rounded-full h-2 effect-inset">
                          <div
                            className={`bg-green-500 h-2 rounded-full`}
                            style={{
                              width: `${node.deviceMetrics.airUtilTx}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Telemetry Info - Environment Metrics */}
          {node.environmentMetrics &&
            Object.keys(node.environmentMetrics).length > 0 && (
              <Section
                title="Environment Data"
                icon={<Thermometer className="w-4 h-4" />}
              >
                <div className="space-y-4">
                  {node.environmentMetrics.temperature !== undefined && (
                    <div className="flex flex-col">
                      <div className="flex justify-between mb-1 bg-neutral-700/50 p-2 rounded effect-inset">
                        <span className="text-neutral-400 flex items-center">
                          <Thermometer className="w-3 h-3 mr-2" />
                          Temperature
                        </span>
                        <span
                          className={`
                        ${
                          node.environmentMetrics.temperature > 30
                            ? "text-red-500"
                            : node.environmentMetrics.temperature < 10
                              ? "text-blue-500"
                              : "text-green-500"
                        } font-mono text-sm
                      `}
                        >
                          {node.environmentMetrics.temperature}°C
                        </span>
                      </div>
                      <div className="w-full bg-neutral-700/70 rounded-full h-2 effect-inset mt-1">
                        {/* Temp scale: -10°C to 40°C mapped to 0-100% */}
                        <div
                          className={`
                          ${
                            node.environmentMetrics.temperature > 30
                              ? "bg-red-500"
                              : node.environmentMetrics.temperature < 10
                                ? "bg-blue-500"
                                : "bg-green-500"
                          } h-2 rounded-full
                        `}
                          style={{
                            width: `${Math.max(0, Math.min(100, ((node.environmentMetrics.temperature + 10) / 50) * 100))}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {node.environmentMetrics.relativeHumidity !== undefined && (
                    <div className="flex flex-col mt-3">
                      <div className="flex justify-between mb-1 bg-neutral-700/50 p-2 rounded effect-inset">
                        <span className="text-neutral-400 flex items-center">
                          <Droplets className="w-3 h-3 mr-2" />
                          Humidity
                        </span>
                        <span className="text-blue-400 font-mono text-sm">
                          {node.environmentMetrics.relativeHumidity}%
                        </span>
                      </div>
                      <div className="w-full bg-neutral-700/70 rounded-full h-2 effect-inset mt-1">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${node.environmentMetrics.relativeHumidity}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {node.environmentMetrics.barometricPressure !== undefined && (
                    <KeyValuePair
                      label="Pressure"
                      value={`${node.environmentMetrics.barometricPressure} hPa`}
                      icon={<Gauge className="w-3 h-3" />}
                      monospace={true}
                      inset={true}
                    />
                  )}

                  {node.environmentMetrics.soilMoisture !== undefined && (
                    <div className="flex flex-col mt-3">
                      <div className="flex justify-between mb-1 bg-neutral-700/50 p-2 rounded effect-inset">
                        <span className="text-neutral-400 flex items-center">
                          <Droplets className="w-3 h-3 mr-2" />
                          Soil Moisture
                        </span>
                        <span className="text-green-400 font-mono text-sm">
                          {node.environmentMetrics.soilMoisture}%
                        </span>
                      </div>
                      <div className="w-full bg-neutral-700/70 rounded-full h-2 effect-inset mt-1">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${node.environmentMetrics.soilMoisture}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

          {/* Warning for low battery */}
          {node.batteryLevel !== undefined && node.batteryLevel < 20 && (
            <div className="bg-red-900/30 border border-red-800 p-4 rounded-lg effect-inset">
              <div className="flex items-center text-red-400">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <h3 className="font-medium font-mono tracking-wider">
                  LOW BATTERY WARNING
                </h3>
              </div>
              <p className="text-sm mt-2 text-neutral-300 flex items-center">
                <BatteryLow className="w-3 h-3 mr-1.5 text-red-400" />
                Battery level critically low at{" "}
                <span className="font-mono text-red-400 mx-1">
                  {node.batteryLevel}%
                </span>
                Device may stop reporting soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
