/* eslint-disable react-hooks/exhaustive-deps */
import React, { useRef, useEffect, useState, useCallback } from "react";
import { useAppSelector } from "../../hooks";
import { useNavigate } from "@tanstack/react-router";
import { NodeData, GatewayData } from "../../store/slices/aggregatorSlice";
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
}

/**
 * NetworkMap displays all nodes with position data on a Google Map
 */
export const NetworkMap = React.forwardRef<{ resetAutoZoom: () => void }, NetworkMapProps>(
  ({ height, fullHeight = false, onAutoZoomChange }, ref) => {
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
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Get nodes data from the store
  const { nodes, gateways } = useAppSelector((state) => state.aggregator);
  
   // Expose the resetAutoZoom function via ref
  React.useImperativeHandle(ref, () => ({
    resetAutoZoom: () => {
      resetAutoZoom();
    }
  }));

  // Reset auto-zoom behavior
  const resetAutoZoom = useCallback(() => {
    setAutoZoomEnabled(true);
    
    // Notify parent component of auto-zoom state change
    if (onAutoZoomChange) {
      onAutoZoomChange(true);
    }
    
    if (mapInstanceRef.current && nodesWithPosition.length > 0) {
      fitMapToBounds();
    }
  }, [nodesWithPosition, onAutoZoomChange]);

  // Function to fit map to bounds
  const fitMapToBounds = useCallback(() => {
    if (!mapInstanceRef.current || !window.google || !window.google.maps) return;
    
    // Create new bounds for calculation
    boundsRef.current = new google.maps.LatLngBounds();
    
    // Extend bounds for each node
    nodesWithPosition.forEach(node => {
      const lat = node.position.latitudeI / 10000000;
      const lng = node.position.longitudeI / 10000000;
      boundsRef.current?.extend({ lat, lng });
    });
    
    // Fit the bounds to see all nodes
    if (boundsRef.current) {
      mapInstanceRef.current.fitBounds(boundsRef.current);
      
      // If we only have one node, ensure we're not too zoomed in
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
        updateNodeMarkers(nodesWithPosition, navigate);
        return true;
      } catch (error) {
        console.error("Error initializing map:", error);
        return false;
      }
    }
    console.warn("Cannot initialize map - prerequisites not met");
    return false;
  }, [nodesWithPosition, navigate, updateNodeMarkers, initializeMap]);

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
  }, [setupZoomListener, mapInstanceRef.current, isGoogleMapsLoaded]);
  
  // Update parent component when auto-zoom state changes
  useEffect(() => {
    if (onAutoZoomChange) {
      onAutoZoomChange(autoZoomEnabled);
    }
  }, [autoZoomEnabled, onAutoZoomChange]);
  

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up zoom listener
      if (zoomListenerRef.current && window.google && window.google.maps) {
        window.google.maps.event.removeListener(zoomListenerRef.current);
        zoomListenerRef.current = null;
      }
      
      // Clean up markers
      Object.values(markersRef.current).forEach(marker => marker.map = null);
      
      // Clean up any pending animations
      Object.values(animatingNodesRef.current).forEach(timeoutId => 
        window.clearTimeout(timeoutId)
      );
      
      // Close info window
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };
  }, []);
  
  // Helper function to initialize the map
  function initializeMap(element: HTMLDivElement): void {
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
  }
  
  // Helper function to update node markers on the map
  function updateNodeMarkers(nodes: MapNode[], navigate: ReturnType<typeof useNavigate>): void {
    if (!mapInstanceRef.current) return;
    
    // Clear the bounds for recalculation
    if (window.google && window.google.maps) {
      boundsRef.current = new google.maps.LatLngBounds();
    } else {
      boundsRef.current = null;
    }
    const allKeys = new Set<string>();

    // Update markers for each node with position
    nodes.forEach(node => {
      const key = `node-${node.id}`;
      allKeys.add(key);
      
      // Convert coordinates to lat/lng
      const lat = node.position.latitudeI / 10000000;
      const lng = node.position.longitudeI / 10000000;
      const position = { lat, lng };
      
      // Extend bounds to include this point
      if (boundsRef.current) {
        boundsRef.current.extend(position);
      }
      
      // Get node name
      const nodeName = node.shortName || node.longName || 
        `${node.isGateway ? 'Gateway' : 'Node'} ${node.id.toString(16)}`;
      
      // Create or update marker
      if (!markersRef.current[key]) {
        createMarker(node, position, nodeName, navigate);
      } else {
        updateMarker(node, position);
      }
    });
    
    // Remove markers that don't exist in the current data set
    Object.keys(markersRef.current).forEach(key => {
      if (!allKeys.has(key)) {
        markersRef.current[key].map = null;
        delete markersRef.current[key];
      }
    });
    
    // If auto-zoom is enabled and we have nodes, fit the map to show all of them
    if (autoZoomEnabled && nodes.length > 0) {
      fitMapToBounds();
    }
  }
  
  // Create a new marker
  function createMarker(
    node: MapNode, 
    position: google.maps.LatLngLiteral, 
    nodeName: string, 
    navigate: ReturnType<typeof useNavigate>
  ): void {
    if (!mapInstanceRef.current || !infoWindowRef.current) return;
    
    const key = `node-${node.id}`;
    
    // Get the marker icon style
    const iconStyle = getMarkerIcon(node);
    
    // Create content for the advanced marker
    const markerContent = document.createElement('div');
    markerContent.innerHTML = `
      <svg width="${iconStyle.scale * 2}" height="${iconStyle.scale * 2}" viewBox="0 0 ${iconStyle.scale * 2} ${iconStyle.scale * 2}" xmlns="http://www.w3.org/2000/svg">
        <circle 
          cx="${iconStyle.scale}" 
          cy="${iconStyle.scale}" 
          r="${iconStyle.scale - iconStyle.strokeWeight}" 
          fill="${iconStyle.fillColor}" 
          fill-opacity="${iconStyle.fillOpacity}"
          stroke="${iconStyle.strokeColor}" 
          stroke-width="${iconStyle.strokeWeight}" 
        />
      </svg>
    `;
    
    // Set the container style to allow pointer events on it
    markerContent.style.cursor = 'pointer';
    
    const marker = new google.maps.marker.AdvancedMarkerElement({
      position,
      map: mapInstanceRef.current,
      title: nodeName,
      zIndex: node.isGateway ? 10 : 5, // Make gateways appear on top
      content: markerContent,
    });
    
    // Add click listener to show info window
    marker.addListener('gmp-click', () => {
      showInfoWindow(node, marker, navigate);
    });
    
    markersRef.current[key] = marker;
  }
  
  // Update an existing marker
  function updateMarker(node: MapNode, position: google.maps.LatLngLiteral): void {
    const key = `node-${node.id}`;
    const marker = markersRef.current[key];
    
    // Update position
    marker.position = position;
    
    // Get the marker icon style
    const iconStyle = getMarkerIcon(node);
    
    // Create updated content for the marker
    const markerContent = document.createElement('div');
    markerContent.innerHTML = `
      <svg width="${iconStyle.scale * 2}" height="${iconStyle.scale * 2}" viewBox="0 0 ${iconStyle.scale * 2} ${iconStyle.scale * 2}" xmlns="http://www.w3.org/2000/svg">
        <circle 
          cx="${iconStyle.scale}" 
          cy="${iconStyle.scale}" 
          r="${iconStyle.scale - iconStyle.strokeWeight}" 
          fill="${iconStyle.fillColor}" 
          fill-opacity="${iconStyle.fillOpacity}"
          stroke="${iconStyle.strokeColor}" 
          stroke-width="${iconStyle.strokeWeight}" 
        />
      </svg>
    `;
    
    // Set cursor style
    markerContent.style.cursor = 'pointer';
    
    // Update the marker content
    marker.content = markerContent;
  }
  
  // Show info window for a node
  function showInfoWindow(
    node: MapNode, 
    marker: google.maps.marker.AdvancedMarkerElement, 
    navigate: ReturnType<typeof useNavigate>
  ): void {
    if (!infoWindowRef.current || !mapInstanceRef.current) return;
    
    const nodeName = node.longName || node.shortName || `!${node.id.toString(16)}`;
    
    const secondsAgo = node.lastHeard ? Math.floor(Date.now() / 1000) - node.lastHeard : 0;
    const lastSeenText = formatLastSeen(secondsAgo);
    
    // Get activity level and styles using the helper functions
    const activityLevel = getActivityLevel(node.lastHeard, node.isGateway);
    const colors = getNodeColors(activityLevel, node.isGateway);
    const statusText = getStatusText(activityLevel);
    
    // Use the dot color from our activity helper
    const statusDotColor = colors.fill;
    
    const infoContent = `
      <div style="font-family: sans-serif; max-width: 240px; color: #999999;">
        <h3 style="margin: 0 0 8px; font-size: 16px; color: ${statusDotColor}; font-weight: 600;">
          ${nodeName}
        </h3>
        <div style="font-size: 12px; color: #555; margin-bottom: 8px; font-weight: 500;">
          ${node.isGateway ? 'Gateway' : 'Node'} · !${node.id.toString(16)}
        </div>
        <div style="font-size: 12px; margin-bottom: 4px; color: #333; display: flex; align-items: center;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${statusDotColor}; margin-right: 6px;"></span>
          <span>${statusText} - Last seen: ${lastSeenText}</span>
        </div>
        <div style="font-size: 12px; margin-bottom: 8px; color: #333;">
          Packets: ${node.messageCount || 0} · Text: ${node.textMessageCount || 0}
        </div>
        <a href="javascript:void(0);" 
           id="view-node-${node.id}" 
           style="font-size: 13px; color: #3b82f6; text-decoration: none; font-weight: 500; display: inline-block; padding: 4px 8px; background-color: #f1f5f9; border-radius: 4px;">
          View details →
        </a>
      </div>
    `;
    
    infoWindowRef.current.setContent(infoContent);
    infoWindowRef.current.open(mapInstanceRef.current, marker);
    
    // Add listener for the "View details" link with a delay to allow DOM to update
    setTimeout(() => {
      const link = document.getElementById(`view-node-${node.id}`);
      if (link) {
        link.addEventListener('gmp-click', () => {
          navigate({ to: `/node/$nodeId`, params: { nodeId: node.id.toString(16) } });
        });
      }
    }, 100);
  }
  
  // Prepare the styling for the map container
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

// Get marker icon for a node
function getMarkerIcon(node: MapNode): MarkerIconConfig {
  const activityLevel = getActivityLevel(node.lastHeard, node.isGateway);
  const colors = getNodeColors(activityLevel, node.isGateway);
  
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 12, 
    fillColor: colors.fill,
    fillOpacity: 0.8,
    strokeColor: colors.stroke,
    strokeWeight: 4,
  };
}
