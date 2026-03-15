import React, { useRef, useCallback, useEffect, useState, useMemo } from "react";
import ReactMap, { Source, Layer, Popup, MapRef } from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { CARTO_DARK_STYLE_LABELLED } from "../../lib/mapStyle";
import { useAppSelector } from "../../hooks";
import { useNavigate } from "@tanstack/react-router";
import { NodeData, GatewayData } from "../../store/slices/aggregatorSlice";
import { Position } from "../../lib/types";
import { getActivityLevel, getNodeColors, getStatusText, formatLastSeen } from "../../lib/activity";

interface NetworkMapProps {
  /** Height of the map in CSS units (optional) */
  height?: string;
  /** Callback for when auto-zoom state changes */
  onAutoZoomChange?: (enabled: boolean) => void;
  /** Whether the map should take all available space (default: false) */
  fullHeight?: boolean;
  /** Whether to show topology link polylines (default: true) */
  showLinks?: boolean;
}

interface MapNode {
  id: number;
  position: Position & {
    latitudeI: number;
    longitudeI: number;
  };
  isGateway: boolean;
  gatewayId?: string;
  shortName?: string;
  longName?: string;
  lastHeard?: number;
  messageCount: number;
  textMessageCount: number;
}

/**
 * NetworkMap displays all nodes with position data on a MapLibre GL map
 */
export const NetworkMap = React.forwardRef<{ resetAutoZoom: () => void }, NetworkMapProps>(
  ({ height, fullHeight = false, onAutoZoomChange, showLinks = true }, ref) => {
    const navigate = useNavigate();
    const mapRef = useRef<MapRef>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [autoZoomEnabled, setAutoZoomEnabled] = useState(true);
    const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);

    const { nodes, gateways } = useAppSelector((state) => state.aggregator);
    const topologyLinks = useAppSelector((state) => state.topology.links);

    const nodesWithPosition = useMemo(
      () => getNodesWithPosition(nodes, gateways),
      [nodes, gateways]
    );

    // Build GeoJSON for node circles
    const nodesGeoJSON = useMemo((): FeatureCollection => ({
      type: "FeatureCollection",
      features: nodesWithPosition.map((node) => {
        const level = getActivityLevel(node.lastHeard, node.isGateway);
        const colors = getNodeColors(level, node.isGateway);
        return {
          type: "Feature",
          id: node.id,
          geometry: {
            type: "Point",
            coordinates: [
              node.position.longitudeI / 10000000,
              node.position.latitudeI / 10000000,
            ],
          },
          properties: {
            nodeId: node.id,
            name: node.shortName || node.longName || `!${node.id.toString(16)}`,
            fillColor: colors.fill,
            strokeColor: colors.stroke,
            radius: node.isGateway ? 12 : 8,
          },
        };
      }),
    }), [nodesWithPosition]);

    // Build GeoJSON for topology links
    const linksGeoJSON = useMemo((): FeatureCollection => {
      const posMap = new Map<number, [number, number]>();
      for (const node of nodesWithPosition) {
        posMap.set(node.id, [
          node.position.longitudeI / 10000000,
          node.position.latitudeI / 10000000,
        ]);
      }
      return {
        type: "FeatureCollection",
        features: Object.values(topologyLinks)
          .filter((link) => posMap.has(link.nodeA) && posMap.has(link.nodeB))
          .map((link) => {
            const snr = link.snrAtoB ?? link.snrBtoA;
            const color =
              snr === undefined ? "#6b7280"
              : snr >= 5 ? "#22c55e"
              : snr >= 0 ? "#eab308"
              : "#ef4444";
            return {
              type: "Feature" as const,
              geometry: {
                type: "LineString" as const,
                coordinates: [posMap.get(link.nodeA)!, posMap.get(link.nodeB)!],
              },
              properties: { color, opacity: link.viaMqtt ? 0.4 : 0.7 },
            };
          }),
      };
    }, [topologyLinks, nodesWithPosition]);

    // Fit map bounds when auto-zoom is enabled and nodes change
    useEffect(() => {
      if (!autoZoomEnabled || nodesWithPosition.length === 0 || !mapRef.current || !mapLoaded) return;
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (const n of nodesWithPosition) {
        const lng = n.position.longitudeI / 10000000;
        const lat = n.position.latitudeI / 10000000;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      mapRef.current.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 60, maxZoom: 15, duration: 500 }
      );
    }, [autoZoomEnabled, nodesWithPosition, mapLoaded]);

    // Notify parent of auto-zoom state
    useEffect(() => {
      onAutoZoomChange?.(autoZoomEnabled);
    }, [autoZoomEnabled, onAutoZoomChange]);

    // Expose resetAutoZoom via ref
    React.useImperativeHandle(ref, () => ({
      resetAutoZoom: () => setAutoZoomEnabled(true),
    }));

    // Disable auto-zoom on user interaction
    const handleUserInteraction = useCallback(() => {
      setAutoZoomEnabled(false);
    }, []);

    // Handle node click via interactiveLayerIds
    const handleMapClick = useCallback(
      (e: { features?: Array<{ properties: Record<string, unknown> }> }) => {
        const features = e.features;
        if (!features || features.length === 0) {
          setSelectedNode(null);
          return;
        }
        const nodeId = features[0].properties?.nodeId as number | undefined;
        if (nodeId === undefined) return;
        const node = nodesWithPosition.find((n) => n.id === nodeId);
        if (node) setSelectedNode(node);
      },
      [nodesWithPosition]
    );

    const wrapperClassName = `w-full ${fullHeight ? "h-full flex flex-col" : ""}`;
    const mapClassName = `w-full overflow-hidden effect-inset rounded-lg relative ${fullHeight ? "flex-1" : ""}`;
    const containerStyle = height && !fullHeight ? { height } : fullHeight ? { height: "100%" } : {};

    return (
      <div className={wrapperClassName}>
        <div className={mapClassName} style={containerStyle}>
          <ReactMap
            ref={mapRef}
            mapStyle={CARTO_DARK_STYLE_LABELLED}
            initialViewState={{ longitude: -98, latitude: 39, zoom: 4 }}
            style={{ width: "100%", height: "100%" }}
            attributionControl={{ compact: true }}
            interactiveLayerIds={["nodes-circles"]}
            onMouseEnter={() => {
              if (mapRef.current) mapRef.current.getMap().getCanvas().style.cursor = "pointer";
            }}
            onMouseLeave={() => {
              if (mapRef.current) mapRef.current.getMap().getCanvas().style.cursor = "grab";
            }}
            onClick={handleMapClick as never}
            onDragStart={handleUserInteraction}
            onZoomStart={handleUserInteraction}
            onLoad={() => setMapLoaded(true)}
          >
            {/* Sources and layers — only after map style has loaded */}
            {mapLoaded && (
              <>
                <Source id="links" type="geojson" data={linksGeoJSON}>
                  <Layer
                    id="links-line"
                    type="line"
                    layout={{
                      "line-join": "round",
                      "line-cap": "round",
                      "visibility": showLinks ? "visible" : "none",
                    }}
                    paint={{
                      "line-color": ["get", "color"],
                      "line-width": 2,
                      "line-opacity": ["get", "opacity"],
                    }}
                  />
                </Source>

                <Source id="nodes" type="geojson" data={nodesGeoJSON}>
                  <Layer
                    id="nodes-circles"
                    type="circle"
                    paint={{
                      "circle-radius": ["get", "radius"],
                      "circle-color": ["get", "fillColor"],
                      "circle-stroke-width": 2,
                      "circle-stroke-color": ["get", "strokeColor"],
                      "circle-opacity": 0.9,
                      "circle-stroke-opacity": 1,
                    }}
                  />
                  <Layer
                    id="nodes-labels"
                    type="symbol"
                    layout={{
                      "text-field": ["get", "name"],
                      "text-size": 11,
                      "text-offset": [0, 1.5],
                      "text-anchor": "top",
                      "text-optional": true,
                    }}
                    paint={{
                      "text-color": "#e5e7eb",
                      "text-halo-color": "#111827",
                      "text-halo-width": 1.5,
                    }}
                  />
                </Source>
              </>
            )}

            {/* Node popup */}
            {selectedNode && (
              <Popup
                longitude={selectedNode.position.longitudeI / 10000000}
                latitude={selectedNode.position.latitudeI / 10000000}
                onClose={() => setSelectedNode(null)}
                closeOnClick={false}
                maxWidth="240px"
                anchor="bottom"
              >
                <NodePopup
                  node={selectedNode}
                  onNavigate={(id) => {
                    setSelectedNode(null);
                    navigate({ to: "/node/$nodeId", params: { nodeId: id.toString(16) } });
                  }}
                />
              </Popup>
            )}
          </ReactMap>
        </div>
      </div>
    );
  }
);

NetworkMap.displayName = "NetworkMap";

// ─── Popup content ────────────────────────────────────────────────────────────

function NodePopup({
  node,
  onNavigate,
}: {
  node: MapNode;
  onNavigate: (id: number) => void;
}) {
  const level = getActivityLevel(node.lastHeard, node.isGateway);
  const colors = getNodeColors(level, node.isGateway);
  const statusText = getStatusText(level);
  const secondsAgo = node.lastHeard ? Math.floor(Date.now() / 1000) - node.lastHeard : 0;
  const lastSeenText = formatLastSeen(secondsAgo);
  const nodeName = node.longName || node.shortName || `!${node.id.toString(16)}`;

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 220 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: colors.fill, marginBottom: 3 }}>
        {nodeName}
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
        {node.isGateway ? "Gateway" : "Node"} · !{node.id.toString(16)}
      </div>
      <div style={{ display: "flex", alignItems: "center", fontSize: 11, marginBottom: 4 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: colors.fill,
            display: "inline-block",
            marginRight: 5,
            flexShrink: 0,
          }}
        />
        <span style={{ color: "#374151" }}>
          {statusText} · {lastSeenText}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
        Packets: {node.messageCount} · Text: {node.textMessageCount}
      </div>
      <button
        onClick={() => onNavigate(node.id)}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "#3b82f6",
          background: "#f1f5f9",
          border: "none",
          borderRadius: 4,
          padding: "4px 8px",
          cursor: "pointer",
        }}
      >
        View details →
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasValidPosition(node: NodeData): boolean {
  return Boolean(
    node.position &&
      node.position.latitudeI !== undefined &&
      node.position.longitudeI !== undefined
  );
}

function getNodesWithPosition(
  nodes: Record<number, NodeData>,
  gateways: Record<string, GatewayData>
): MapNode[] {
  const nodesMap = new Map<number, MapNode>();

  Object.entries(nodes).forEach(([nodeIdStr, nodeData]) => {
    if (hasValidPosition(nodeData)) {
      const nodeId = parseInt(nodeIdStr);
      const position = nodeData.position as MapNode["position"];
      nodesMap.set(nodeId, {
        ...nodeData,
        id: nodeId,
        isGateway: !!nodeData.isGateway,
        position,
        messageCount: nodeData.messageCount || 0,
        textMessageCount: nodeData.textMessageCount || 0,
      });
    }
  });

  Object.entries(gateways).forEach(([gatewayId, gatewayData]) => {
    const nodeId = parseInt(gatewayId.substring(1), 16);
    const nodeWithMapReport = nodes[nodeId];

    if (
      nodeWithMapReport?.mapReport &&
      nodeWithMapReport.mapReport.latitudeI !== undefined &&
      nodeWithMapReport.mapReport.longitudeI !== undefined
    ) {
      if (!nodesMap.has(nodeId)) {
        nodesMap.set(nodeId, {
          id: nodeId,
          isGateway: true,
          gatewayId,
          position: {
            latitudeI: nodeWithMapReport.mapReport.latitudeI!,
            longitudeI: nodeWithMapReport.mapReport.longitudeI!,
            precisionBits: nodeWithMapReport.mapReport.positionPrecision,
            time: nodeWithMapReport.lastHeard || Math.floor(Date.now() / 1000),
          },
          lastHeard: nodeWithMapReport.lastHeard,
          messageCount: nodeWithMapReport.messageCount || gatewayData.messageCount || 0,
          textMessageCount: nodeWithMapReport.textMessageCount || gatewayData.textMessageCount || 0,
          shortName: nodeWithMapReport.shortName,
          longName: nodeWithMapReport.longName,
        });
      }
    } else if (nodesMap.has(nodeId)) {
      const existingNode = nodesMap.get(nodeId)!;
      nodesMap.set(nodeId, {
        ...existingNode,
        isGateway: true,
        gatewayId,
        lastHeard: Math.max(existingNode.lastHeard || 0, gatewayData.lastHeard || 0),
        messageCount: existingNode.messageCount || gatewayData.messageCount || 0,
        textMessageCount: existingNode.textMessageCount || gatewayData.textMessageCount || 0,
      });
    }
  });

  return Array.from(nodesMap.values());
}
