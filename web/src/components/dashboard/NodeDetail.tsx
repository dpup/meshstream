import React, { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppSelector, useAppDispatch } from "../../hooks";
import { selectNode } from "../../store/slices/aggregatorSlice";
import { ArrowLeft, Radio, Battery, Cpu, Thermometer, Gauge, Signal, Droplets, Map, Calendar, Clock } from "lucide-react";

interface NodeDetailProps {
  nodeId: number;
}

export const NodeDetail: React.FC<NodeDetailProps> = ({ nodeId }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { nodes } = useAppSelector((state) => state.aggregator);
  const node = nodes[nodeId];

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
      <div className="p-6 text-red-400 border border-red-900 rounded bg-neutral-900">
        <div className="flex items-center mb-3">
          <button
            onClick={handleBack}
            className="flex items-center mr-3 px-2 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
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
  const nodeName = node.shortName || node.longName || `Node ${nodeId.toString(16)}`;
  
  // Format timestamps
  const lastHeardDate = new Date(node.lastHeard * 1000);
  const lastHeardTime = lastHeardDate.toLocaleTimeString();
  const lastHeardDay = lastHeardDate.toLocaleDateString();
  
  // Calculate how recently node was active
  const secondsAgo = Math.floor(Date.now() / 1000) - node.lastHeard;
  const minutesAgo = Math.floor(secondsAgo / 60);
  const hoursAgo = Math.floor(minutesAgo / 60);
  const daysAgo = Math.floor(hoursAgo / 24);
  
  let lastSeenText = '';
  if (secondsAgo < 60) {
    lastSeenText = `${secondsAgo} seconds ago`;
  } else if (minutesAgo < 60) {
    lastSeenText = `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
  } else if (hoursAgo < 24) {
    lastSeenText = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
  } else {
    lastSeenText = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
  }

  // Is node active
  const isActive = secondsAgo < 600; // 10 minutes
  
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button
          onClick={handleBack}
          className="flex items-center mr-3 px-2 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <div className={`p-2 mr-3 rounded-full ${isActive ? 'bg-green-900/30 text-green-500' : 'bg-neutral-700/30 text-neutral-500'}`}>
          <Radio className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-semibold text-neutral-200">{nodeName}</h1>
        <div className="ml-auto text-sm text-neutral-400">ID: {nodeId}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
        <div className="bg-neutral-800/50 p-4 rounded-lg">
          <h2 className="font-semibold mb-3 text-neutral-300">Basic Info</h2>
          <div className="space-y-2">
            {node.longName && (
              <div className="flex justify-between">
                <span className="text-neutral-400">Name:</span>
                <span className="text-neutral-200">{node.longName}</span>
              </div>
            )}

            {node.hwModel && (
              <div className="flex justify-between">
                <span className="text-neutral-400">Hardware:</span>
                <span className="text-neutral-200">{node.hwModel}</span>
              </div>
            )}

            {node.macAddr && (
              <div className="flex justify-between">
                <span className="text-neutral-400">MAC Address:</span>
                <span className="text-neutral-200 font-mono text-sm">{node.macAddr}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-neutral-400">Channel:</span>
              <span className="text-neutral-200">{node.channelId || 'Unknown'}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-neutral-400">Gateway:</span>
              <span className="text-neutral-200 font-mono text-xs truncate max-w-[220px]">{node.gatewayId || 'Unknown'}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-neutral-400">Messages:</span>
              <span className="text-neutral-200">{node.messageCount}</span>
            </div>
          </div>
        </div>

        {/* Activity */}
        <div className="bg-neutral-800/50 p-4 rounded-lg">
          <h2 className="font-semibold mb-3 text-neutral-300">Activity</h2>
          <div className="space-y-2">
            <div className="flex items-center mb-3">
              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${isActive ? 'bg-green-500' : 'bg-neutral-500'}`}></span>
              <span className="text-neutral-200">
                {isActive ? 'Active' : 'Inactive'} - last seen {lastSeenText}
              </span>
            </div>

            <div className="flex items-center mb-1.5">
              <Calendar className="w-4 h-4 mr-2 text-neutral-400" />
              <span className="text-neutral-400">Date:</span>
              <span className="ml-auto text-neutral-200">{lastHeardDay}</span>
            </div>

            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-neutral-400" />
              <span className="text-neutral-400">Time:</span>
              <span className="ml-auto text-neutral-200">{lastHeardTime}</span>
            </div>
          </div>
        </div>
        
        {/* Position Info */}
        {node.position && (
          <div className="bg-neutral-800/50 p-4 rounded-lg">
            <h2 className="font-semibold mb-3 text-neutral-300 flex items-center">
              <Map className="w-4 h-4 mr-2" />
              Position
            </h2>
            <div className="space-y-2">
              {node.position.latitudeI !== undefined && node.position.longitudeI !== undefined && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Coordinates:</span>
                  <span className="text-neutral-200 font-mono">
                    {(node.position.latitudeI / 10000000).toFixed(6)}, {(node.position.longitudeI / 10000000).toFixed(6)}
                  </span>
                </div>
              )}
              
              {node.position.altitude !== undefined && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Altitude:</span>
                  <span className="text-neutral-200">{node.position.altitude} m</span>
                </div>
              )}
              
              {node.position.groundSpeed !== undefined && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Speed:</span>
                  <span className="text-neutral-200">{node.position.groundSpeed} m/s</span>
                </div>
              )}

              {node.position.satsInView !== undefined && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Satellites:</span>
                  <span className="text-neutral-200">{node.position.satsInView}</span>
                </div>
              )}
              
              {node.position.locationSource && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Source:</span>
                  <span className="text-neutral-200">{node.position.locationSource.replace('LOC_', '')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Telemetry Info - Device Metrics */}
        {node.deviceMetrics && (
          <div className="bg-neutral-800/50 p-4 rounded-lg">
            <h2 className="font-semibold mb-3 text-neutral-300 flex items-center">
              <Cpu className="w-4 h-4 mr-2" />
              Device Metrics
            </h2>
            <div className="space-y-2">
              {node.batteryLevel !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 flex items-center">
                    <Battery className="w-4 h-4 mr-1.5" />
                    Battery:
                  </span>
                  <span className={`${node.batteryLevel > 30 ? 'text-green-500' : 'text-amber-500'}`}>
                    {node.batteryLevel}%
                  </span>
                </div>
              )}
              
              {node.deviceMetrics.voltage !== undefined && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Voltage:</span>
                  <span className="text-neutral-200">{node.deviceMetrics.voltage.toFixed(2)} V</span>
                </div>
              )}
              
              {node.deviceMetrics.channelUtilization !== undefined && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Channel Utilization:</span>
                  <span className="text-neutral-200">{node.deviceMetrics.channelUtilization}%</span>
                </div>
              )}
              
              {node.deviceMetrics.airUtilTx !== undefined && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Air Utilization:</span>
                  <span className="text-neutral-200">{node.deviceMetrics.airUtilTx}%</span>
                </div>
              )}

              {node.snr !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 flex items-center">
                    <Signal className="w-4 h-4 mr-1.5" />
                    SNR:
                  </span>
                  <span className="text-neutral-200">{node.snr} dB</span>
                </div>
              )}

              {node.deviceMetrics.uptimeSeconds !== undefined && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Uptime:</span>
                  <span className="text-neutral-200">
                    {Math.floor(node.deviceMetrics.uptimeSeconds / 86400)}d {Math.floor((node.deviceMetrics.uptimeSeconds % 86400) / 3600)}h {Math.floor((node.deviceMetrics.uptimeSeconds % 3600) / 60)}m
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Telemetry Info - Environment Metrics */}
        {node.environmentMetrics && Object.keys(node.environmentMetrics).length > 0 && (
          <div className="bg-neutral-800/50 p-4 rounded-lg">
            <h2 className="font-semibold mb-3 text-neutral-300 flex items-center">
              <Thermometer className="w-4 h-4 mr-2" />
              Environment Metrics
            </h2>
            <div className="space-y-2">
              {node.environmentMetrics.temperature !== undefined && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Temperature:</span>
                  <span className="text-neutral-200">{node.environmentMetrics.temperature}°C</span>
                </div>
              )}
              
              {node.environmentMetrics.relativeHumidity !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 flex items-center">
                    <Droplets className="w-4 h-4 mr-1.5" />
                    Humidity:
                  </span>
                  <span className="text-neutral-200">{node.environmentMetrics.relativeHumidity}%</span>
                </div>
              )}
              
              {node.environmentMetrics.barometricPressure !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 flex items-center">
                    <Gauge className="w-4 h-4 mr-1.5" />
                    Pressure:
                  </span>
                  <span className="text-neutral-200">{node.environmentMetrics.barometricPressure} hPa</span>
                </div>
              )}
              
              {/* Add other environment metrics here as needed */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};