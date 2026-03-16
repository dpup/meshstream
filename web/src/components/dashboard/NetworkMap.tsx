import React, { useRef, useCallback, useEffect, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { CARTO_DARK_STYLE_LABELLED } from "../../lib/mapStyle";
import { useAppSelector } from "../../hooks";
import { useNavigate } from "@tanstack/react-router";
import { NodeData, GatewayData } from "../../store/slices/aggregatorSlice";
import { Position } from "../../lib/types";
import { getActivityLevel, getNodeColors, getStatusText, formatLastSeen } from "../../lib/activity";

interface NetworkMapProps {
  height?: string;
  onAutoZoomChange?: (enabled: boolean) => void;
  fullHeight?: boolean;
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

export const NetworkMap = React.forwardRef<{ resetAutoZoom: () => void }, NetworkMapProps>(
  ({ height, fullHeight = false, onAutoZoomChange, showLinks = true }, ref) => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const autoZoomRef = useRef(true);
    const popupRef = useRef<maplibregl.Popup | null>(null);
    const nodesWithPositionRef = useRef<MapNode[]>([]);
    const [autoZoomEnabled, setAutoZoomEnabled] = useState(true);
    const [mapLoaded, setMapLoaded] = useState(false);

    const { nodes, gateways } = useAppSelector((state) => state.aggregator);
    const topologyLinks = useAppSelector((state) => state.topology.links);

    const nodesWithPosition = useMemo(
      () => getNodesWithPosition(nodes, gateways),
      [nodes, gateways]
    );
    nodesWithPositionRef.current = nodesWithPosition;

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
            coordinates: [node.position.longitudeI / 10000000, node.position.latitudeI / 10000000],
          },
          properties: {
            nodeId: node.id,
            name: node.shortName || node.longName || `!${node.id.toString(16)}`,
            fillColor: colors.fill,
            strokeColor: colors.stroke,
            radius: node.isGateway ? 8 : 5,
          },
        };
      }),
    }), [nodesWithPosition]);

    const linksGeoJSON = useMemo((): FeatureCollection => {
      const posMap = new Map<number, [number, number]>();
      for (const node of nodesWithPosition) {
        posMap.set(node.id, [node.position.longitudeI / 10000000, node.position.latitudeI / 10000000]);
      }
      return {
        type: "FeatureCollection",
        features: Object.values(topologyLinks)
          .filter((link) => posMap.has(link.nodeA) && posMap.has(link.nodeB))
          .map((link) => {
            const snr = link.snrAtoB ?? link.snrBtoA;
            const color = snr === undefined ? "#6b7280" : snr >= 5 ? "#22c55e" : snr >= 0 ? "#eab308" : "#ef4444";
            return {
              type: "Feature" as const,
              geometry: { type: "LineString" as const, coordinates: [posMap.get(link.nodeA)!, posMap.get(link.nodeB)!] },
              properties: { color, opacity: 0.7, viaMqtt: link.viaMqtt ? 1 : 0 },
            };
          }),
      };
    }, [topologyLinks, nodesWithPosition]);

    const disableAutoZoom = useCallback(() => {
      autoZoomRef.current = false;
      setAutoZoomEnabled(false);
      onAutoZoomChange?.(false);
    }, [onAutoZoomChange]);

    // Mount map once
    useEffect(() => {
      if (!containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: CARTO_DARK_STYLE_LABELLED,
        center: [-98, 39],
        zoom: 4,
        attributionControl: false,
      });

      map.addControl(new maplibregl.AttributionControl({ compact: true }));
      map.addControl(new maplibregl.NavigationControl(), 'top-left');

      map.on("load", () => {
        setMapLoaded(true);
        map.addSource("links", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "links-line",
          type: "line",
          source: "links",
          filter: ["==", ["get", "viaMqtt"], 0],
          layout: { "line-join": "round", "line-cap": "round", visibility: "visible" },
          paint: { "line-color": ["get", "color"], "line-width": 2, "line-opacity": ["get", "opacity"] },
        });
        map.addLayer({
          id: "links-mqtt",
          type: "line",
          source: "links",
          filter: ["==", ["get", "viaMqtt"], 1],
          layout: { "line-join": "round", "line-cap": "butt", visibility: "visible" },
          paint: { "line-color": "#f97316", "line-width": 2, "line-opacity": 0.6, "line-dasharray": [2, 3] },
        });

        map.addSource("nodes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "nodes-circles",
          type: "circle",
          source: "nodes",
          paint: {
            "circle-radius": ["get", "radius"],
            "circle-color": ["get", "fillColor"],
            "circle-stroke-width": 2,
            "circle-stroke-color": ["get", "strokeColor"],
            "circle-opacity": 0.9,
            "circle-stroke-opacity": 1,
          },
        });
        map.addLayer({
          id: "nodes-labels",
          type: "symbol",
          source: "nodes",
          layout: { "text-field": ["get", "name"], "text-font": ["Open Sans Regular"], "text-size": 11, "text-offset": [0, 1.5], "text-anchor": "top", "text-optional": true },
          paint: { "text-color": "#e5e7eb", "text-halo-color": "#111827", "text-halo-width": 1.5 },
        });
      });

      map.on("dragstart", disableAutoZoom);
      map.on("zoomstart", disableAutoZoom);

      map.on("mouseenter", "nodes-circles", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "nodes-circles", () => { map.getCanvas().style.cursor = "grab"; });

      map.on("click", "nodes-circles", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as { nodeId: number; name: string; fillColor: string };
        const nodeId = props.nodeId;
        const node = nodesWithPositionRef.current.find((n) => n.id === nodeId);
        if (!node) return;

        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        const level = getActivityLevel(node.lastHeard, node.isGateway);
        const colors = getNodeColors(level, node.isGateway);
        const statusText = getStatusText(level);
        const secondsAgo = node.lastHeard ? Math.floor(Date.now() / 1000) - node.lastHeard : 0;
        const lastSeenText = formatLastSeen(secondsAgo);
        const nodeName = node.longName || node.shortName || `!${node.id.toString(16)}`;

        popupRef.current?.remove();

        const el = document.createElement("div");
        el.style.cssText = "font-family:sans-serif;max-width:220px;padding:2px 0";
        el.innerHTML = `
          <div style="font-weight:600;font-size:14px;color:${colors.fill};margin-bottom:3px">${nodeName}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:6px">${node.isGateway ? "Gateway" : "Node"} · !${node.id.toString(16)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-bottom:4px">
            <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${colors.fill};margin-right:5px;vertical-align:middle"></span>
            ${statusText} · ${lastSeenText}
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-bottom:10px">Packets: ${node.messageCount} · Text: ${node.textMessageCount}</div>
          <button id="nav-btn" style="font-size:12px;font-weight:500;color:rgba(147,197,253,0.9);background:none;border:none;padding:0;cursor:pointer;letter-spacing:0.01em">View details →</button>
        `;
        el.querySelector("#nav-btn")?.addEventListener("click", () => {
          popup.remove();
          navigate({ to: "/node/$nodeId", params: { nodeId: node.id.toString(16) } });
        });

        const popup = new maplibregl.Popup({ closeOnClick: true, maxWidth: "240px", anchor: "bottom" })
          .setLngLat(coords)
          .setDOMContent(el)
          .addTo(map);
        popupRef.current = popup;
      });

      map.on("click", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["nodes-circles"] });
        if (!features.length) popupRef.current?.remove();
      });

      mapRef.current = map;
      return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update node/link data
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;
      (map.getSource("nodes") as GeoJSONSource)?.setData(nodesGeoJSON);
      (map.getSource("links") as GeoJSONSource)?.setData(linksGeoJSON);
    }, [nodesGeoJSON, linksGeoJSON, mapLoaded]);

    // Toggle links visibility
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;
      map.setLayoutProperty("links-line", "visibility", showLinks ? "visible" : "none");
      map.setLayoutProperty("links-mqtt", "visibility", showLinks ? "visible" : "none");
    }, [showLinks, mapLoaded]);

    // Auto-zoom to fit nodes
    useEffect(() => {
      const map = mapRef.current;
      if (!autoZoomRef.current || nodesWithPosition.length === 0 || !map || !mapLoaded) return;
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (const n of nodesWithPosition) {
        const lng = n.position.longitudeI / 10000000;
        const lat = n.position.latitudeI / 10000000;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, maxZoom: 15, duration: 500 });
    }, [nodesWithPosition, mapLoaded]);

    // Notify parent of auto-zoom state
    useEffect(() => {
      onAutoZoomChange?.(autoZoomEnabled);
    }, [autoZoomEnabled, onAutoZoomChange]);

    // Expose resetAutoZoom via ref
    React.useImperativeHandle(ref, () => ({
      resetAutoZoom: () => {
        autoZoomRef.current = true;
        setAutoZoomEnabled(true);
        onAutoZoomChange?.(true);
      },
    }));

    const wrapperClassName = `w-full ${fullHeight ? "h-full flex flex-col" : ""}`;
    const mapClassName = `w-full overflow-hidden effect-inset rounded-lg relative ${fullHeight ? "flex-1" : ""}`;
    const containerStyle = height && !fullHeight ? { height } : fullHeight ? { height: "100%" } : {};

    return (
      <div className={wrapperClassName}>
        <div className={mapClassName} style={containerStyle}>
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
    );
  }
);

NetworkMap.displayName = "NetworkMap";

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
