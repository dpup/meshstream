import React, { useRef, useEffect, useState, useCallback } from "react";
import { useAppSelector } from "../../hooks";
import { useNavigate } from "@tanstack/react-router";
import { NodeData, GatewayData } from "../../store/slices/aggregatorSlice";
import { LinkObservation } from "../../store/slices/topologySlice";
import { Position } from "../../lib/types";
import { getActivityLevel, getNodeColors, getStatusText, formatLastSeen } from "../../lib/activity";
import { GOOGLE_MAPS_ID } from "../../lib/config";

interface NetworkMapProps {
  /** Height of the map in CSS units (optional, will use flex-grow by default) */
  height?: string;
  /** Callback for when auto-zoom state changes */
  onAutoZoomChange?: (enabled: boolean) => void;
  /** Whether the map should take all available space (default: false) */
  fullHeight?: boolean;
  /** Whether to show topology link polylines (default: true) */
  showLinks?: boolean;
}

/**
 * NetworkMap displays all nodes with position data on a Google Map
 */
export const NetworkMap = React.forwardRef<{ resetAutoZoom: () => void }, NetworkMapProps>(
  ({ height, fullHeight = false, onAutoZoomChange, showLinks = true }, ref) => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<string, google.maps.marker.AdvancedMarkerElement>>({});
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const boundsRef = useRef<google.maps.LatLngBounds | null>(null);
  const [nodesWithPosition, setNodesWithPosition] = useState<MapNode[]>([]);
  const animatingNodesRef = useRef<Record<string, number>>({});
  const [autoZoomEnabled, setAutoZoomEnabled] = useState(true);
  // Using any for the event listener since TypeScript can't find the MapsEventListener interface
  const zoomListenerRef = useRef<any>(null);
  const polylinesRef = useRef<Record<string, google.maps.Polyline>>({});
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Get nodes data from the store
  const { nodes, gateways } = useAppSelector((state) => state.aggregator);
  const topologyLinks = useAppSelector((state) => state.topology.links);
  
   // Expose the resetAutoZoom function via ref
  React.useImperativeHandle(ref, () => ({
    resetAutoZoom: () => {
      resetAutoZoom();
    }
  }));

  // Function to fit map to bounds
  const fitMapToBounds = useCallback(() => {
    if (!mapInstanceRef.current || !window.google || !window.google.maps) return;

    boundsRef.current = new google.maps.LatLngBounds();

    nodesWithPosition.forEach(node => {
      const lat = node.position.latitudeI / 10000000;
      const lng = node.position.longitudeI / 10000000;
      boundsRef.current?.extend({ lat, lng });
    });

    if (boundsRef.current) {
      mapInstanceRef.current.fitBounds(boundsRef.current);

      if (nodesWithPosition.length === 1) {
        setTimeout(() => {
          if (mapInstanceRef.current) {
            const currentZoom = mapInstanceRef.current.getZoom() || 15;
            mapInstanceRef.current.setZoom(Math.min(currentZoom, 15));
          }
        }, 100);
      }
    }
  }, [nodesWithPosition]);

  // Reset auto-zoom behavior
  const resetAutoZoom = useCallback(() => {
    setAutoZoomEnabled(true);

    if (onAutoZoomChange) {
      onAutoZoomChange(true);
    }

    if (mapInstanceRef.current && nodesWithPosition.length > 0) {
      fitMapToBounds();
    }
  }, [nodesWithPosition, onAutoZoomChange, fitMapToBounds]);

  // Setup zoom change listener
  const setupZoomListener = useCallback(() => {
    if (!mapInstanceRef.current || !window.google || !window.google.maps) {
      console.warn("Cannot set up zoom listener - map or Google Maps API not ready");
      return;
    }
    
    try {
      // Remove previous listener if it exists
      if (zoomListenerRef.current) {
        // Use google.maps.event.removeListener for better compatibility
        window.google.maps.event.removeListener(zoomListenerRef.current);
        zoomListenerRef.current = null;
      }
          
      zoomListenerRef.current = window.google.maps.event.addListener(
        mapInstanceRef.current, 
        'zoom_changed', 
        () => {
          console.log("Zoom changed detected");
          // Disable auto-zoom when user manually zooms
          setAutoZoomEnabled(false);
          
          // Notify parent component of auto-zoom state change
          if (onAutoZoomChange) {
            onAutoZoomChange(false);
          }
        }
      );
      
    } catch (error) {
      console.error("Error setting up zoom listener:", error);
    }
  }, [onAutoZoomChange]);

  // Effect to build the list of nodes with position data
  useEffect(() => {
    const nodeArray = getNodesWithPosition(nodes, gateways);
    setNodesWithPosition(nodeArray);
  }, [nodes, gateways]);

  // Show info window for a node
  const showInfoWindow = useCallback((
    node: MapNode,
    marker: google.maps.marker.AdvancedMarkerElement
  ): void => {
    if (!infoWindowRef.current || !mapInstanceRef.current) return;

    const nodeName = node.longName || node.shortName || `!${node.id.toString(16)}`;
    const secondsAgo = node.lastHeard ? Math.floor(Date.now() / 1000) - node.lastHeard : 0;
    const lastSeenText = formatLastSeen(secondsAgo);
    const activityLevel = getActivityLevel(node.lastHeard, node.isGateway);
    const colors = getNodeColors(activityLevel, node.isGateway);
    const statusText = getStatusText(activityLevel);
    const statusDotColor = colors.fill;

    const container = document.createElement('div');
    container.style.cssText = 'font-family: sans-serif; max-width: 240px; color: #999999;';

    const heading = document.createElement('h3');
    heading.style.cssText = `margin: 0 0 8px; font-size: 16px; color: ${statusDotColor}; font-weight: 600;`;
    heading.textContent = nodeName;
    container.appendChild(heading);

    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size: 12px; color: #555; margin-bottom: 8px; font-weight: 500;';
    subtitle.textContent = `${node.isGateway ? 'Gateway' : 'Node'} · !${node.id.toString(16)}`;
    container.appendChild(subtitle);

    const statusRow = document.createElement('div');
    statusRow.style.cssText = 'font-size: 12px; margin-bottom: 4px; color: #333; display: flex; align-items: center;';
    const dot = document.createElement('span');
    dot.style.cssText = `display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${statusDotColor}; margin-right: 6px;`;
    const statusLabel = document.createElement('span');
    statusLabel.textContent = `${statusText} - Last seen: ${lastSeenText}`;
    statusRow.appendChild(dot);
    statusRow.appendChild(statusLabel);
    container.appendChild(statusRow);

    const counts = document.createElement('div');
    counts.style.cssText = 'font-size: 12px; margin-bottom: 8px; color: #333;';
    counts.textContent = `Packets: ${node.messageCount || 0} · Text: ${node.textMessageCount || 0}`;
    container.appendChild(counts);

    const link = document.createElement('a');
    link.href = `/node/${node.id.toString(16)}`;
    link.style.cssText = 'font-size: 13px; color: #3b82f6; text-decoration: none; font-weight: 500; display: inline-block; padding: 4px 8px; background-color: #f1f5f9; border-radius: 4px;';
    link.textContent = 'View details →';
    container.appendChild(link);

    infoWindowRef.current.setContent(container);
    infoWindowRef.current.open(mapInstanceRef.current, marker);
  }, []);

  // Update an existing marker
  const updateMarker = useCallback((node: MapNode, position: google.maps.LatLngLiteral): void => {
    const key = `node-${node.id}`;
    const marker = markersRef.current[key];
    marker.position = position;
    marker.content = buildMarkerContent(node);
  }, []);

  // Create a new marker
  const createMarker = useCallback((
    node: MapNode,
    position: google.maps.LatLngLiteral,
    nodeName: string
  ): void => {
    if (!mapInstanceRef.current || !infoWindowRef.current) return;

    const key = `node-${node.id}`;
    const marker = new google.maps.marker.AdvancedMarkerElement({
      position,
      map: mapInstanceRef.current,
      title: nodeName,
      zIndex: node.isGateway ? 10 : 5,
      content: buildMarkerContent(node),
    });

    marker.addListener('gmp-click', () => {
      showInfoWindow(node, marker);
    });

    markersRef.current[key] = marker;
  }, [showInfoWindow]);

  // Helper function to initialize the map
  const initializeMap = useCallback((element: HTMLDivElement): void => {
    const mapOptions: google.maps.MapOptions = {
      zoom: 10,
      colorScheme: 'DARK',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      mapId: GOOGLE_MAPS_ID,
    };
    mapInstanceRef.current = new google.maps.Map(element, mapOptions);
    infoWindowRef.current = new google.maps.InfoWindow();
  }, []);

  // Helper function to update node markers on the map
  const updateNodeMarkers = useCallback((nodes: MapNode[]): void => {
    if (!mapInstanceRef.current) return;

    if (window.google && window.google.maps) {
      boundsRef.current = new google.maps.LatLngBounds();
    } else {
      boundsRef.current = null;
    }
    const allKeys = new Set<string>();

    nodes.forEach(node => {
      const key = `node-${node.id}`;
      allKeys.add(key);

      const lat = node.position.latitudeI / 10000000;
      const lng = node.position.longitudeI / 10000000;
      const position = { lat, lng };

      if (boundsRef.current) {
        boundsRef.current.extend(position);
      }

      const nodeName = node.shortName || node.longName ||
        `${node.isGateway ? 'Gateway' : 'Node'} ${node.id.toString(16)}`;

      if (!markersRef.current[key]) {
        createMarker(node, position, nodeName);
      } else {
        updateMarker(node, position);
      }
    });

    Object.keys(markersRef.current).forEach(key => {
      if (!allKeys.has(key)) {
        markersRef.current[key].map = null;
        delete markersRef.current[key];
      }
    });

    if (autoZoomEnabled && nodes.length > 0) {
      fitMapToBounds();
    }
  }, [autoZoomEnabled, fitMapToBounds, createMarker, updateMarker]);

  // Update topology polylines on the map
  const updateLinks = useCallback((
    links: Record<string, LinkObservation>,
    nodePositions: MapNode[],
    visible: boolean
  ): void => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Build position lookup
    const posMap = new Map<number, google.maps.LatLngLiteral>();
    for (const node of nodePositions) {
      posMap.set(node.id, {
        lat: node.position.latitudeI / 10000000,
        lng: node.position.longitudeI / 10000000,
      });
    }

    const activeKeys = new Set<string>();

    for (const link of Object.values(links)) {
      const posA = posMap.get(link.nodeA);
      const posB = posMap.get(link.nodeB);
      if (!posA || !posB) continue;

      activeKeys.add(link.key);

      // Determine color based on best available SNR
      const snr = link.snrAtoB ?? link.snrBtoA;
      let strokeColor: string;
      if (snr === undefined) {
        strokeColor = "#6b7280"; // gray — no SNR data
      } else if (snr >= 5) {
        strokeColor = "#22c55e"; // green — strong
      } else if (snr >= 0) {
        strokeColor = "#eab308"; // yellow — marginal
      } else {
        strokeColor = "#ef4444"; // red — weak
      }
      const strokeOpacity = link.viaMqtt ? 0.4 : 0.7;

      if (polylinesRef.current[link.key]) {
        const pl = polylinesRef.current[link.key];
        pl.setPath([posA, posB]);
        pl.setOptions({ strokeColor, strokeOpacity, visible });
      } else {
        polylinesRef.current[link.key] = new google.maps.Polyline({
          path: [posA, posB],
          geodesic: true,
          strokeColor,
          strokeOpacity,
          strokeWeight: 2,
          map: visible ? mapInstanceRef.current : null,
        });
      }
    }

    // Remove polylines for edges no longer in state
    for (const key of Object.keys(polylinesRef.current)) {
      if (!activeKeys.has(key)) {
        polylinesRef.current[key].setMap(null);
        delete polylinesRef.current[key];
      }
    }
  }, []);

  // Check for Google Maps API and initialize
  const tryInitializeMap = useCallback(() => {
    if (mapRef.current && window.google && window.google.maps) {
      try {
        // Initialize map if not already done
        if (!mapInstanceRef.current) {
          initializeMap(mapRef.current);
        }

        // Create info window if not already done
        if (!infoWindowRef.current) {
          infoWindowRef.current = new google.maps.InfoWindow();
        }

        // Update markers and fit the map
        updateNodeMarkers(nodesWithPosition);
        updateLinks(topologyLinks, nodesWithPosition, showLinks);
        return true;
      } catch (error) {
        console.error("Error initializing map:", error);
        return false;
      }
    }
    console.warn("Cannot initialize map - prerequisites not met");
    return false;
  }, [nodesWithPosition, topologyLinks, showLinks, updateNodeMarkers, updateLinks, initializeMap]);

  // Check for Google Maps API loading - make sure all required objects are available
  useEffect(() => {
    // Function to check if all required Google Maps components are loaded
    const checkGoogleMapsLoaded = () => {
      return window.google && 
             window.google.maps && 
             window.google.maps.Map && 
             window.google.maps.InfoWindow && 
             window.google.maps.marker && 
             window.google.maps.marker.AdvancedMarkerElement;
    };
    
    // Check if Google Maps is already loaded with all required components
    if (checkGoogleMapsLoaded()) {
      setIsGoogleMapsLoaded(true);
      return;
    }
    
    // Set up a listener for when the API loads
    const handleGoogleMapsLoaded = () => {
      // Wait a bit to ensure all Maps objects are initialized
      setTimeout(() => {
        if (checkGoogleMapsLoaded()) {
          setIsGoogleMapsLoaded(true);
        }
      }, 100);
    };
    
    // Add event listener for Google Maps API loading
    window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    
    // Also try checking after a short delay (backup)
    const timeoutId = setTimeout(() => {
      if (checkGoogleMapsLoaded()) {
        setIsGoogleMapsLoaded(true);
      } else {
        console.warn("Google Maps API didn't fully load after timeout");
      }
    }, 2000);
    
    // Cleanup
    return () => {
      window.removeEventListener('google-maps-loaded', handleGoogleMapsLoaded);
      clearTimeout(timeoutId);
    };
  }, []);
  
  // Don't try to initialize map until we're sure Google Maps is fully loaded
  useEffect(() => {
    if (isGoogleMapsLoaded && 
        mapRef.current && 
        window.google?.maps?.Map && 
        window.google?.maps?.InfoWindow &&
        window.google?.maps?.marker?.AdvancedMarkerElement) {
      const initialized = tryInitializeMap();
      
      // If we successfully initialized the map, also set up the zoom listener
      if (initialized && mapInstanceRef.current) {
        setupZoomListener();
      }
    }
  }, [isGoogleMapsLoaded, nodesWithPosition, navigate, tryInitializeMap, setupZoomListener]);
  
  // Also set up zoom listener whenever the map instance changes
  useEffect(() => {
    if (mapInstanceRef.current && window.google && window.google.maps && isGoogleMapsLoaded) {
      setupZoomListener();
    }
  }, [setupZoomListener, isGoogleMapsLoaded]);
  
  // Update parent component when auto-zoom state changes
  useEffect(() => {
    if (onAutoZoomChange) {
      onAutoZoomChange(autoZoomEnabled);
    }
  }, [autoZoomEnabled, onAutoZoomChange]);
  

  // Cleanup on unmount
  useEffect(() => {
    const zoomListener = zoomListenerRef;
    const markers = markersRef;
    const animatingNodes = animatingNodesRef;
    const infoWindow = infoWindowRef;
    const polylines = polylinesRef;
    return () => {
      if (zoomListener.current && window.google && window.google.maps) {
        window.google.maps.event.removeListener(zoomListener.current);
        zoomListener.current = null;
      }
      Object.values(markers.current).forEach(marker => marker.map = null);
      Object.values(animatingNodes.current).forEach(timeoutId =>
        window.clearTimeout(timeoutId)
      );
      Object.values(polylines.current).forEach(pl => pl.setMap(null));
      if (infoWindow.current) {
        infoWindow.current.close();
      }
    };
  }, []);
  
  const mapContainerStyle = {
    ...(height && !fullHeight ? { height } : {}),
    ...(fullHeight ? { height: '100%' } : {})
  };

  const wrapperClassName = `w-full ${fullHeight ? 'h-full flex flex-col' : ''}`;
  const mapClassName = `w-full overflow-hidden effect-inset rounded-lg relative ${fullHeight ? 'flex-1' : ''}`;

  if (!isGoogleMapsLoaded) {
    return (
      <div className={wrapperClassName}>
        <div 
          className={`${mapClassName} flex items-center justify-center`}
          style={mapContainerStyle}
        >
          <div className="text-gray-400">Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <div 
        ref={mapRef} 
        className={mapClassName}
        style={mapContainerStyle}
      />
    </div>
  );
});

NetworkMap.displayName = "NetworkMap";

// Define interface for nodes with position data for map display
interface MapNode {
  id: number;
  position: Position & {
    latitudeI: number; // Override to make required
    longitudeI: number; // Override to make required
  };
  isGateway: boolean;
  gatewayId?: string;
  shortName?: string;
  longName?: string;
  lastHeard?: number;
  messageCount: number;
  textMessageCount: number;
}

// Helper function to determine if a node has valid position data
function hasValidPosition(node: NodeData): boolean {
  return Boolean(
    node.position && 
    node.position.latitudeI !== undefined && 
    node.position.longitudeI !== undefined
  );
}

// Get a list of nodes that have position data
function getNodesWithPosition(
  nodes: Record<number, NodeData>, 
  gateways: Record<string, GatewayData>
): MapNode[] {
  const nodesMap = new Map<number, MapNode>(); // Use a Map to avoid duplicates
  
  // Regular nodes
  Object.entries(nodes).forEach(([nodeIdStr, nodeData]) => {
    if (hasValidPosition(nodeData)) {
      const nodeId = parseInt(nodeIdStr);
      const position = nodeData.position as MapNode['position'];
      nodesMap.set(nodeId, {
        ...nodeData,
        id: nodeId,
        isGateway: !!nodeData.isGateway,
        position,
        messageCount: nodeData.messageCount || 0,
        textMessageCount: nodeData.textMessageCount || 0
      });
    }
  });

  // Gateways - we need to find the corresponding node for each gateway
  Object.entries(gateways).forEach(([gatewayId, gatewayData]) => {
    // Extract node ID from gateway ID (removing the '!' prefix)
    const nodeId = parseInt(gatewayId.substring(1), 16);
    
    // First priority: Check if we already have the node with a mapReport 
    // (since mapReport is stored on NodeData, not GatewayData)
    const nodeWithMapReport = nodes[nodeId];
    
    if (
      nodeWithMapReport?.mapReport && 
      nodeWithMapReport.mapReport.latitudeI !== undefined && 
      nodeWithMapReport.mapReport.longitudeI !== undefined
    ) {
      // Use mapReport position from the node data if we haven't already added this node
      if (!nodesMap.has(nodeId)) {
        nodesMap.set(nodeId, {
          id: nodeId,
          isGateway: true,
          gatewayId: gatewayId,
          position: {
            latitudeI: nodeWithMapReport.mapReport.latitudeI!,
            longitudeI: nodeWithMapReport.mapReport.longitudeI!,
            precisionBits: nodeWithMapReport.mapReport.positionPrecision,
            time: nodeWithMapReport.lastHeard || Math.floor(Date.now() / 1000)
          },
          // Include other data
          lastHeard: nodeWithMapReport.lastHeard,
          messageCount: nodeWithMapReport.messageCount || gatewayData.messageCount || 0,
          textMessageCount: nodeWithMapReport.textMessageCount || gatewayData.textMessageCount || 0,
          shortName: nodeWithMapReport.shortName,
          longName: nodeWithMapReport.longName
        });
      }
    } 
    // Second priority: Mark existing node as gateway if it already has position data
    else if (nodesMap.has(nodeId)) {
      const existingNode = nodesMap.get(nodeId)!;
      nodesMap.set(nodeId, {
        ...existingNode,
        isGateway: true,
        gatewayId: gatewayId,
        // Update data from gateway information
        lastHeard: Math.max(existingNode.lastHeard || 0, gatewayData.lastHeard || 0),
        messageCount: existingNode.messageCount || gatewayData.messageCount || 0,
        textMessageCount: existingNode.textMessageCount || gatewayData.textMessageCount || 0
      });
    }
  });

  return Array.from(nodesMap.values());
}

// Interface for marker icon configuration
interface MarkerIconConfig {
  path: number;
  scale: number;
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWeight: number;
}

// Build marker content element for a node (pure, no React state)
function buildMarkerContent(node: MapNode): HTMLElement {
  const iconStyle = getMarkerIcon(node);
  const size = iconStyle.scale * 2;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', String(iconStyle.scale));
  circle.setAttribute('cy', String(iconStyle.scale));
  circle.setAttribute('r', String(iconStyle.scale - iconStyle.strokeWeight));
  circle.setAttribute('fill', iconStyle.fillColor);
  circle.setAttribute('fill-opacity', String(iconStyle.fillOpacity));
  circle.setAttribute('stroke', iconStyle.strokeColor);
  circle.setAttribute('stroke-width', String(iconStyle.strokeWeight));
  svg.appendChild(circle);
  const wrapper = document.createElement('div');
  wrapper.style.cursor = 'pointer';
  wrapper.appendChild(svg);
  return wrapper;
}

// Get marker icon for a node
function getMarkerIcon(node: MapNode): MarkerIconConfig {
  const activityLevel = getActivityLevel(node.lastHeard, node.isGateway);
  const colors = getNodeColors(activityLevel, node.isGateway);
  
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 12, 
    fillColor: colors.fill,
    fillOpacity: 1,
    strokeColor: colors.stroke,
    strokeWeight: 2,
  };
}
