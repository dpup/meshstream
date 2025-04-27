import React, { useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useAppSelector, useAppDispatch } from "../../hooks";
import { selectNode } from "../../store/slices/aggregatorSlice";
import {
  ArrowLeft,
  Radio,
  Cpu,
  Clock,
  Calendar,
  Map,
  Zap,
  ChevronRight,
  Signal,
  Wifi,
  Users,
  Earth,
  TableConfig,
  Save,
  MessageSquare,
  Thermometer,
} from "lucide-react";
import { Separator } from "../Separator";
import { KeyValuePair } from "../ui/KeyValuePair";
import { Section } from "../ui/Section";
import { BatteryLevel } from "./BatteryLevel";
import { SignalStrength } from "./SignalStrength";
import { GoogleMap } from "./GoogleMap";
import { NodePositionData } from "./NodePositionData";
import { EnvironmentMetrics } from "./EnvironmentMetrics";
import { NodePacketList } from "./NodePacketList";
import { LowBatteryWarning } from "./LowBatteryWarning";
import { UtilizationMetrics } from "./UtilizationMetrics";
import { calculateAccuracyFromPrecisionBits } from "../../lib/mapUtils";
import {
  formatUptime,
  getRegionName,
  getModemPresetName,
} from "../../utils/formatters";

interface NodeDetailProps {
  nodeId: number;
}

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
    <div className="max-w-4xl">
      {/* Header with back button and basic node info */}
      <div className="flex items-center px-4 bg-neutral-800/50 rounded-lg">
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
        {/* First column: Device Information and Device Status */}
        <div>
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
                    <span className="font-mono text-sm">{node.channelId}</span>
                  </Link>
                ) : (
                  <span className="text-neutral-400 italic">None detected</span>
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

          {/* Device Status - Moved from the right column to here */}
          {(node.deviceMetrics ||
            node.batteryLevel !== undefined ||
            node.snr !== undefined) && (
            <Section
              title="Device Status"
              icon={<Cpu className="w-4 h-4" />}
              className="mt-4"
            >
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
                  <UtilizationMetrics
                    channelUtilization={node.deviceMetrics.channelUtilization}
                    airUtilTx={node.deviceMetrics.airUtilTx}
                  />
                )}
              </div>
            </Section>
          )}

          {/* Warning for low battery */}
          {node.batteryLevel !== undefined && (
            <LowBatteryWarning batteryLevel={node.batteryLevel} />
          )}
        </div>

        {/* Second column: Last Activity and Environment Metrics */}
        <div>
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
                icon={<Clock className="w-3 h-3" />}
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
                  node.gatewayId === `!${nodeId.toString(16).toLowerCase()}` ? (
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
                  <span className="text-neutral-400 italic">None detected</span>
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

          {/* Environment Metrics */}
          {node.environmentMetrics &&
            Object.keys(node.environmentMetrics).length > 0 && (
              <Section
                title="Environment Data"
                icon={<Thermometer className="w-4 h-4" />}
                className="mt-4"
              >
                <EnvironmentMetrics
                  temperature={node.environmentMetrics.temperature}
                  relativeHumidity={node.environmentMetrics.relativeHumidity}
                  barometricPressure={
                    node.environmentMetrics.barometricPressure
                  }
                  soilMoisture={node.environmentMetrics.soilMoisture}
                />
              </Section>
            )}
        </div>
      </div>

      {/* Position Map - Full Width */}
      {hasPosition && (
        <Section
          title="Node Location"
          icon={<Map className="w-4 h-4" />}
          className="mt-6"
        >
          <div className="h-[400px] rounded-lg overflow-hidden relative shadow-inner">
            <GoogleMap
              lat={latitude}
              lng={longitude}
              precisionBits={precisionBits}
            />
          </div>
          <NodePositionData
            latitude={latitude}
            longitude={longitude}
            altitude={node.position?.altitude}
            positionAccuracy={positionAccuracy}
            precisionBits={precisionBits}
            satsInView={node.position?.satsInView}
            groundSpeed={node.position?.groundSpeed}
          />
        </Section>
      )}

      {/* Recent Packets - Full Width */}
      <Section
        title="Recent Packets"
        icon={<MessageSquare className="w-4 h-4" />}
        className="mt-6"
      >
        <NodePacketList nodeId={nodeId} />
      </Section>
    </div>
  );
};
