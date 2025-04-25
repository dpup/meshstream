import React, { useEffect, useRef } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useAppSelector, useAppDispatch } from "../../hooks";
import { selectNode } from "../../store/slices/aggregatorSlice";
import { 
  ArrowLeft, Radio, Battery, Cpu, Thermometer, Gauge, Signal, 
  Droplets, Map, Calendar, Clock, Wifi, BarChart, 
  BatteryFull, BatteryMedium, BatteryLow, AlertTriangle, 
  Zap, Timer, ChevronRight
} from "lucide-react";

interface NodeDetailProps {
  nodeId: number;
}

// Google Maps API is already loaded - this creates a map component
const GoogleMap: React.FC<{lat: number, lng: number, zoom?: number}> = ({lat, lng, zoom = 14}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (mapRef.current && window.google && window.google.maps) {
      // Create map instance
      const mapOptions: google.maps.MapOptions = {
        center: { lat, lng },
        zoom,
        mapTypeId: google.maps.MapTypeId.HYBRID,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          {
            "featureType": "all",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#ffffff"}]
          },
          {
            "featureType": "all",
            "elementType": "labels.text.stroke",
            "stylers": [{"visibility": "off"}]
          },
          {
            "featureType": "administrative",
            "elementType": "geometry",
            "stylers": [{"visibility": "on"}, {"color": "#2d2d2d"}]
          },
          {
            "featureType": "landscape",
            "elementType": "geometry",
            "stylers": [{"color": "#1a1a1a"}]
          },
          {
            "featureType": "poi",
            "elementType": "geometry",
            "stylers": [{"color": "#1a1a1a"}]
          },
          {
            "featureType": "road",
            "elementType": "geometry.fill",
            "stylers": [{"color": "#2d2d2d"}]
          },
          {
            "featureType": "road",
            "elementType": "geometry.stroke",
            "stylers": [{"color": "#333333"}]
          },
          {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{"color": "#0f252e"}]
          }
        ]
      };

      mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions);

      // Add marker
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

      // Add accuracy circle if available
      if (markerRef.current) {
        new google.maps.Circle({
          strokeColor: "#22c55e",
          strokeOpacity: 0.5,
          strokeWeight: 1,
          fillColor: "#4ade80",
          fillOpacity: 0.15,
          map: mapInstanceRef.current,
          center: { lat, lng },
          radius: 300 // 300m accuracy as default
        });
      }

    }
  }, [lat, lng, zoom]);

  return <div ref={mapRef} className="w-full h-full min-h-[300px] rounded-lg overflow-hidden" />;
};

// Battery level component with visual indicator
const BatteryLevel: React.FC<{level: number}> = ({level}) => {
  let color = 'bg-green-500';
  let icon = <BatteryFull className="w-5 h-5" />;
  
  if (level <= 20) {
    color = 'bg-red-500';
    icon = <BatteryLow className="w-5 h-5" />;
  } else if (level <= 50) {
    color = 'bg-amber-500';
    icon = <BatteryMedium className="w-5 h-5" />;
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="text-neutral-400 flex items-center">
          {icon}
          <span className="ml-1.5">Battery</span>
        </span>
        <span className={`${level > 30 ? 'text-green-500' : 'text-amber-500'} font-medium`}>
          {level}%
        </span>
      </div>
      <div className="w-full bg-neutral-700 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full`} style={{width: `${level}%`}}></div>
      </div>
    </div>
  );
};

// Signal strength component with visual indicator
const SignalStrength: React.FC<{snr: number}> = ({snr}) => {
  // SNR is typically in dB, with values from -20 to +20
  // Higher is better: < 0 is poor, > 10 is excellent
  let strengthClass = 'bg-red-500';
  let strengthText = 'Poor';
  
  if (snr > 10) {
    strengthClass = 'bg-green-500';
    strengthText = 'Excellent';
  } else if (snr > 5) {
    strengthClass = 'bg-green-400';
    strengthText = 'Good';
  } else if (snr > 0) {
    strengthClass = 'bg-amber-500';
    strengthText = 'Fair';
  }
  
  // Calculate width percentage (0-100%)
  // Map SNR from -20...+20 to 0...100%
  const percentage = Math.max(0, Math.min(100, ((snr + 20) / 40) * 100));
  
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="text-neutral-400 flex items-center">
          <Signal className="w-5 h-5" />
          <span className="ml-1.5">Signal</span>
        </span>
        <span className="text-neutral-200">
          {snr} dB <span className="text-xs">({strengthText})</span>
        </span>
      </div>
      <div className="w-full bg-neutral-700 rounded-full h-2.5">
        <div className={`${strengthClass} h-2.5 rounded-full`} style={{width: `${percentage}%`}}></div>
      </div>
    </div>
  );
};

// Format uptime into a human-readable string
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.join(' ') || '< 1m';
};

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
  
  // Get position data if available
  const hasPosition = node.position && 
    node.position.latitudeI !== undefined && 
    node.position.longitudeI !== undefined;
  
  const latitude = hasPosition ? node.position!.latitudeI! / 10000000 : 0;
  const longitude = hasPosition ? node.position!.longitudeI! / 10000000 : 0;
  
  return (
    <div className="space-y-6">
      {/* Header with back button and basic node info */}
      <div className="flex items-center p-4 bg-neutral-800/50 rounded-lg">
        <button
          onClick={handleBack}
          className="flex items-center mr-4 p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className={`p-2 mr-3 rounded-full ${isActive ? 'bg-green-900/30 text-green-500' : 'bg-neutral-700/30 text-neutral-500'}`}>
          <Radio className="w-5 h-5" />
        </div>
        <div className="flex-1 flex flex-col md:flex-row md:items-center">
          <h1 className="text-xl font-semibold text-neutral-200 mr-3">{nodeName}</h1>
          <div className="text-sm text-neutral-400 flex items-center">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-green-500' : 'bg-neutral-500'}`}></span>
            {isActive ? 'Active' : 'Inactive'} - last seen {lastSeenText}
          </div>
        </div>
        <div className="text-sm text-neutral-400 bg-neutral-900/50 px-3 py-1.5 rounded font-mono">
          ID: {nodeId.toString(16)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Info */}
            <div className="bg-neutral-800/50 p-4 rounded-lg">
              <h2 className="font-semibold mb-4 text-neutral-300 border-b border-neutral-700 pb-2">Device Information</h2>
              <div className="space-y-3">
                {node.longName && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Name:</span>
                    <span className="text-neutral-200">{node.longName}</span>
                  </div>
                )}

                {node.hwModel && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Hardware:</span>
                    <span className="text-neutral-200">{node.hwModel}</span>
                  </div>
                )}

                {node.macAddr && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">MAC Address:</span>
                    <span className="text-neutral-200 font-mono text-sm">{node.macAddr}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Channels:</span>
                  <div className="flex flex-col items-end">
                    {node.channelId ? (
                      <Link
                        to="/channel/$channelId"
                        params={{ channelId: node.channelId }}
                        className="text-neutral-200 flex items-center hover:text-blue-400 transition-colors"
                      >
                        <Wifi className="w-4 h-4 mr-1.5 text-blue-400" />
                        {node.channelId}
                      </Link>
                    ) : (
                      <span className="text-neutral-400 italic">None detected</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-700">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Packets:</span>
                    <div className="flex space-x-3">
                      <div className="flex flex-col items-center">
                        <span className="text-amber-500 font-medium text-lg">{node.messageCount}</span>
                        <span className="text-xs text-neutral-500">Total</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-green-500 font-medium text-lg">{node.textMessageCount}</span>
                        <span className="text-xs text-neutral-500">Text</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity */}
            <div className="bg-neutral-800/50 p-4 rounded-lg">
              <h2 className="font-semibold mb-4 text-neutral-300 border-b border-neutral-700 pb-2">Last Activity</h2>
              <div className="space-y-3">
                <div className="flex items-center text-sm bg-neutral-700/50 p-2 rounded">
                  <Calendar className="w-4 h-4 mr-2 text-neutral-300" />
                  <span className="text-neutral-400">Date:</span>
                  <span className="ml-auto text-neutral-200">{lastHeardDay}</span>
                </div>

                <div className="flex items-center text-sm bg-neutral-700/50 p-2 rounded">
                  <Clock className="w-4 h-4 mr-2 text-neutral-300" />
                  <span className="text-neutral-400">Time:</span>
                  <span className="ml-auto text-neutral-200">{lastHeardTime}</span>
                </div>

                {node.deviceMetrics?.uptimeSeconds !== undefined && (
                  <div className="flex items-center mt-3 bg-neutral-700/50 p-2 rounded">
                    <Timer className="w-4 h-4 mr-2 text-neutral-300" />
                    <span className="text-neutral-400">Uptime:</span>
                    <span className="ml-auto text-neutral-200">
                      {formatUptime(node.deviceMetrics.uptimeSeconds)}
                    </span>
                  </div>
                )}

                <div className="mt-2 pt-3 border-t border-neutral-700">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Gateways:</span>
                    <div className="flex flex-col items-end">
                      {node.gatewayId ? (
                        <Link
                          to="/node/$nodeId"
                          params={{ nodeId: node.gatewayId.substring(1) }}
                          className="text-neutral-200 font-mono text-xs truncate max-w-[180px] hover:text-blue-400 transition-colors flex items-center"
                        >
                          {node.gatewayId}
                          <ChevronRight className="w-4 h-4 text-neutral-500 ml-1" />
                        </Link>
                      ) : (
                        <span className="text-neutral-400 italic">None detected</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Position Map */}
          {hasPosition && (
            <div className="bg-neutral-800/50 p-4 rounded-lg mt-4">
              <h2 className="font-semibold mb-3 text-neutral-300 flex items-center">
                <Map className="w-4 h-4 mr-2" />
                Node Location
              </h2>
              <div className="h-[350px] mt-3 rounded-lg overflow-hidden">
                <GoogleMap lat={latitude} lng={longitude} zoom={14} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                <div className="bg-neutral-700/50 p-2 rounded">
                  <span className="text-neutral-400">Coordinates:</span>
                  <span className="float-right text-neutral-200 font-mono">
                    {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </span>
                </div>
                
                {node.position?.altitude !== undefined && (
                  <div className="bg-neutral-700/50 p-2 rounded">
                    <span className="text-neutral-400">Altitude:</span>
                    <span className="float-right text-neutral-200">{node.position.altitude} m</span>
                  </div>
                )}
                
                {node.position?.satsInView !== undefined && (
                  <div className="bg-neutral-700/50 p-2 rounded">
                    <span className="text-neutral-400">Satellites:</span>
                    <span className="float-right text-neutral-200">{node.position.satsInView}</span>
                  </div>
                )}
                
                {node.position?.groundSpeed !== undefined && (
                  <div className="bg-neutral-700/50 p-2 rounded">
                    <span className="text-neutral-400">Speed:</span>
                    <span className="float-right text-neutral-200">{node.position.groundSpeed} m/s</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Telemetry Info - Device Metrics */}
          {(node.deviceMetrics || node.batteryLevel !== undefined || node.snr !== undefined) && (
            <div className="bg-neutral-800/50 p-4 rounded-lg">
              <h2 className="font-semibold mb-4 text-neutral-300 border-b border-neutral-700 pb-2 flex items-center">
                <Cpu className="w-4 h-4 mr-2" />
                Device Status
              </h2>
              <div className="space-y-4">
                {node.batteryLevel !== undefined && (
                  <BatteryLevel level={node.batteryLevel} />
                )}
                
                {node.deviceMetrics?.voltage !== undefined && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-neutral-400 flex items-center">
                      <Zap className="w-4 h-4 mr-1.5" />
                      Voltage:
                    </span>
                    <span className="text-neutral-200">{node.deviceMetrics.voltage.toFixed(2)} V</span>
                  </div>
                )}
                
                {node.snr !== undefined && (
                  <SignalStrength snr={node.snr} />
                )}
                
                {(node.deviceMetrics?.channelUtilization !== undefined || node.deviceMetrics?.airUtilTx !== undefined) && (
                  <div className="mt-3 pt-3 border-t border-neutral-700">
                    <div className="text-sm text-neutral-400 mb-2 flex items-center">
                      <BarChart className="w-4 h-4 mr-1.5" />
                      Channel Utilization:
                    </div>
                    
                    {node.deviceMetrics?.channelUtilization !== undefined && (
                      <div className="flex flex-col mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Total</span>
                          <span>{node.deviceMetrics.channelUtilization}%</span>
                        </div>
                        <div className="w-full bg-neutral-700 rounded-full h-1.5">
                          <div 
                            className={`bg-blue-500 h-1.5 rounded-full`} 
                            style={{width: `${node.deviceMetrics.channelUtilization}%`}}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {node.deviceMetrics?.airUtilTx !== undefined && (
                      <div className="flex flex-col">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Transmit</span>
                          <span>{node.deviceMetrics.airUtilTx}%</span>
                        </div>
                        <div className="w-full bg-neutral-700 rounded-full h-1.5">
                          <div 
                            className={`bg-green-500 h-1.5 rounded-full`} 
                            style={{width: `${node.deviceMetrics.airUtilTx}%`}}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Telemetry Info - Environment Metrics */}
          {node.environmentMetrics && Object.keys(node.environmentMetrics).length > 0 && (
            <div className="bg-neutral-800/50 p-4 rounded-lg">
              <h2 className="font-semibold mb-4 text-neutral-300 border-b border-neutral-700 pb-2 flex items-center">
                <Thermometer className="w-4 h-4 mr-2" />
                Environment Data
              </h2>
              <div className="space-y-4">
                {node.environmentMetrics.temperature !== undefined && (
                  <div className="flex flex-col">
                    <div className="flex justify-between mb-1">
                      <span className="text-neutral-400">Temperature:</span>
                      <span className={`
                        ${node.environmentMetrics.temperature > 30 ? 'text-red-500' : 
                          node.environmentMetrics.temperature < 10 ? 'text-blue-500' : 
                          'text-green-500'} font-medium
                      `}>
                        {node.environmentMetrics.temperature}°C
                      </span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-2">
                      {/* Temp scale: -10°C to 40°C mapped to 0-100% */}
                      <div 
                        className={`
                          ${node.environmentMetrics.temperature > 30 ? 'bg-red-500' : 
                            node.environmentMetrics.temperature < 10 ? 'bg-blue-500' : 
                            'bg-green-500'} h-2 rounded-full
                        `} 
                        style={{
                          width: `${Math.max(0, Math.min(100, ((node.environmentMetrics.temperature + 10) / 50) * 100))}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {node.environmentMetrics.relativeHumidity !== undefined && (
                  <div className="flex flex-col mt-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-neutral-400 flex items-center">
                        <Droplets className="w-4 h-4 mr-1.5" />
                        Humidity:
                      </span>
                      <span className="text-blue-400 font-medium">
                        {node.environmentMetrics.relativeHumidity}%
                      </span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{width: `${node.environmentMetrics.relativeHumidity}%`}}
                      ></div>
                    </div>
                  </div>
                )}
                
                {node.environmentMetrics.barometricPressure !== undefined && (
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-neutral-400 flex items-center">
                      <Gauge className="w-4 h-4 mr-1.5" />
                      Pressure:
                    </span>
                    <span className="text-neutral-200">
                      {node.environmentMetrics.barometricPressure} hPa
                    </span>
                  </div>
                )}

                {node.environmentMetrics.soilMoisture !== undefined && (
                  <div className="flex flex-col mt-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-neutral-400">Soil Moisture:</span>
                      <span className="text-green-400 font-medium">
                        {node.environmentMetrics.soilMoisture}%
                      </span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{width: `${node.environmentMetrics.soilMoisture}%`}}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warning for low battery */}
          {node.batteryLevel !== undefined && node.batteryLevel < 20 && (
            <div className="bg-red-900/30 border border-red-800 p-4 rounded-lg">
              <div className="flex items-center text-red-400">
                <AlertTriangle className="w-5 h-5 mr-2" />
                <h3 className="font-medium">Low Battery Warning</h3>
              </div>
              <p className="text-sm mt-2 text-neutral-300">
                This node's battery level is critically low at {node.batteryLevel}%. 
                The device may stop reporting soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};