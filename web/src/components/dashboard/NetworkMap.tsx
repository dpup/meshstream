/* eslint-disable react-hooks/exhaustive-deps */
import React, { useRef, useEffect, useState } from "react";
import { useAppSelector } from "../../hooks";
import { useNavigate } from "@tanstack/react-router";
import { NodeData, GatewayData } from "../../store/slices/aggregatorSlice";
import { Position } from "../../lib/types";

interface NetworkMapProps {
  /** Height of the map in CSS units */
  height?: string;
}

/**
 * NetworkMap displays all nodes with position data on a Google Map
 */
export const NetworkMap: React.FC<NetworkMapProps> = ({ height = "600px" }) => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<string, google.maps.Marker>>({});
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const boundsRef = useRef<google.maps.LatLngBounds>(new google.maps.LatLngBounds());
  const [nodesWithPosition, setNodesWithPosition] = useState<MapNode[]>([]);
  const animatingNodesRef = useRef<Record<string, number>>({});

  // Get nodes data from the store
  const { nodes, gateways } = useAppSelector((state) => state.aggregator);
  
  // Get the latest packet to detect when nodes receive packets
  const latestPacket = useAppSelector((state) => 
    state.packets.packets.length > 0 ? state.packets.packets[0] : null
  );

  // Effect to build the list of nodes with position data
  useEffect(() => {
    const nodeArray = getNodesWithPosition(nodes, gateways);
    setNodesWithPosition(nodeArray);
  }, [nodes, gateways]);

  // Handle map initialization and marker creation
  useEffect(() => {
    if (!mapRef.current || !window.google || !window.google.maps) return;
    
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
    
  }, [nodesWithPosition, navigate]);
  
  // Effect to detect when a node receives a packet and trigger animation
  useEffect(() => {
    if (latestPacket && latestPacket.data.from !== undefined) {
      const nodeId = latestPacket.data.from;
      const key = `node-${nodeId}`;
      
      // If we have this node on the map, animate it
      if (markersRef.current[key]) {
        animateNodeMarker(nodeId);
      }
    }
  }, [latestPacket]);

  // Function to animate a node marker when it receives a packet
  function animateNodeMarker(nodeId: number): void {
    const key = `node-${nodeId}`;
    const marker = markersRef.current[key];
    const node = nodesWithPosition.find(n => n.id === nodeId);
    
    if (!marker || !node) return;
    
    // Clear any existing animation for this node
    if (animatingNodesRef.current[key]) {
      clearTimeout(animatingNodesRef.current[key]);
    }
    
    // Set the animated style
    marker.setIcon(getMarkerIcon(node, true));
    
    // Reset after a delay
    animatingNodesRef.current[key] = window.setTimeout(() => {
      marker.setIcon(getMarkerIcon(node, false));
      delete animatingNodesRef.current[key];
    }, 1000); // 1 second animation
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up markers
      Object.values(markersRef.current).forEach(marker => marker.setMap(null));
      
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

    mapInstanceRef.current = new google.maps.Map(element, mapOptions);
    infoWindowRef.current = new google.maps.InfoWindow();
  }
  
  // Helper function to update node markers on the map
  function updateNodeMarkers(nodes: MapNode[], navigate: ReturnType<typeof useNavigate>): void {
    if (!mapInstanceRef.current) return;
    
    // Clear the bounds for recalculation
    boundsRef.current = new google.maps.LatLngBounds();
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
      boundsRef.current.extend(position);
      
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
        markersRef.current[key].setMap(null);
        delete markersRef.current[key];
      }
    });
    
    // If we have nodes, fit the map to show all of them
    if (nodes.length > 0) {
      // Fit the bounds to see all nodes
      mapInstanceRef.current?.fitBounds(boundsRef.current);
      
      // If we only have one node, ensure we're not too zoomed in
      if (nodes.length === 1 && mapInstanceRef.current) {
        setTimeout(() => {
          if (mapInstanceRef.current) {
            const currentZoom = mapInstanceRef.current.getZoom() || 15;
            mapInstanceRef.current.setZoom(Math.min(currentZoom, 15));
          }
        }, 100);
      }
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
    const marker = new google.maps.Marker({
      position,
      map: mapInstanceRef.current,
      title: nodeName,
      icon: getMarkerIcon(node),
      zIndex: node.isGateway ? 10 : 5, // Make gateways appear on top
    });
    
    // Add click listener to show info window
    marker.addListener("click", () => {
      showInfoWindow(node, marker, navigate);
    });
    
    markersRef.current[key] = marker;
  }
  
  // Update an existing marker
  function updateMarker(node: MapNode, position: google.maps.LatLngLiteral): void {
    const key = `node-${node.id}`;
    markersRef.current[key].setPosition(position);
    markersRef.current[key].setIcon(getMarkerIcon(node));
  }
  
  // Show info window for a node
  function showInfoWindow(
    node: MapNode, 
    marker: google.maps.Marker, 
    navigate: ReturnType<typeof useNavigate>
  ): void {
    if (!infoWindowRef.current || !mapInstanceRef.current) return;
    
    const nodeName = node.shortName || node.longName || 
      `${node.isGateway ? 'Gateway' : 'Node'} ${node.id.toString(16)}`;
    
    const secondsAgo = node.lastHeard ? Math.floor(Date.now() / 1000) - node.lastHeard : 0;
    let lastSeenText = formatLastSeen(secondsAgo);
    
    const infoContent = `
      <div style="font-family: sans-serif; max-width: 240px; color: #181818;">
        <h3 style="margin: 0 0 8px; font-size: 16px; color: ${node.isGateway ? '#f97316' : '#16a34a'}; font-weight: 600;">
          ${nodeName}
        </h3>
        <div style="font-size: 12px; color: #555; margin-bottom: 8px; font-weight: 500;">
          ${node.isGateway ? 'Gateway' : 'Node'} · ID: ${node.id.toString(16)}
        </div>
        <div style="font-size: 12px; margin-bottom: 4px; color: #333;">
          Last seen: ${lastSeenText}
        </div>
        <div style="font-size: 12px; margin-bottom: 8px; color: #333;">
          Messages: ${node.messageCount || 0} · Text: ${node.textMessageCount || 0}
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
        link.addEventListener('click', () => {
          navigate({ to: `/node/$nodeId`, params: { nodeId: node.id.toString(16) } });
        });
      }
    }, 100);
  }
  
  return (
    <div 
      ref={mapRef} 
      className="w-full overflow-hidden effect-inset rounded-lg"
      style={{ height }}
    />
  );
};

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
function getMarkerIcon(node: MapNode, isAnimating: boolean = false): MarkerIconConfig {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: isAnimating ? 14 : 10, // Increase size during animation
    fillColor: node.isGateway ? "#fb923c" : "#4ade80", // Orange for gateways, green for nodes
    fillOpacity: isAnimating ? 0.8 : 1, // Slightly transparent during animation
    strokeColor: isAnimating ? "#ffffff" : (node.isGateway ? "#f97316" : "#22c55e"),
    strokeWeight: isAnimating ? 3 : 2, // Thicker stroke during animation
  };
}

// Format the "last seen" text
function formatLastSeen(secondsAgo: number): string {
  if (secondsAgo < 60) {
    return `${secondsAgo} seconds ago`;
  } else if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (secondsAgo < 86400) {
    const hours = Math.floor(secondsAgo / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(secondsAgo / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}