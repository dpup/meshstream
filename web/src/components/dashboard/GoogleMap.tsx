import React, { useEffect, useRef, useMemo } from "react";
import maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { CARTO_DARK_STYLE } from "../../lib/mapStyle";
import { buildCircleCoords, calculateAccuracyFromPrecisionBits, calculateZoomFromAccuracy } from "../../lib/mapUtils";

interface NodeLocationMapProps {
  /** Latitude coordinate */
  lat: number;
  /** Longitude coordinate */
  lng: number;
  /** Optional zoom level (1-20) */
  zoom?: number;
  /** Precision bits used for accuracy calculation */
  precisionBits?: number;
  /** Whether the map should take all available space (default: false) */
  fullHeight?: boolean;
}

/**
 * Single-node location map with accuracy circle
 */
export const NodeLocationMap: React.FC<NodeLocationMapProps> = ({
  lat,
  lng,
  zoom,
  precisionBits,
  fullHeight = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const accuracyMeters = calculateAccuracyFromPrecisionBits(precisionBits);
  const effectiveZoom = zoom ?? calculateZoomFromAccuracy(accuracyMeters);

  const markerGeoJSON = useMemo((): FeatureCollection => ({
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} }],
  }), [lat, lng]);

  const circleGeoJSON = useMemo((): FeatureCollection => ({
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [buildCircleCoords(lng, lat, accuracyMeters)] },
      properties: {},
    }],
  }), [lat, lng, accuracyMeters]);

  // Mount map once
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_DARK_STYLE,
      center: [lng, lat],
      zoom: effectiveZoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    map.on("load", () => {
      map.addSource("circle", { type: "geojson", data: circleGeoJSON });
      map.addLayer({ id: "circle-fill", type: "fill", source: "circle", paint: { "fill-color": "#4ade80", "fill-opacity": 0.15 } });
      map.addLayer({ id: "circle-outline", type: "line", source: "circle", paint: { "line-color": "#22c55e", "line-width": 2, "line-opacity": 0.8 } });

      map.addSource("marker", { type: "geojson", data: markerGeoJSON });
      map.addLayer({ id: "marker-dot", type: "circle", source: "marker", paint: {
        "circle-radius": 6,
        "circle-color": "#4ade80",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#22c55e",
        "circle-opacity": 1,
      }});
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update source data when coordinates change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    (map.getSource("marker") as GeoJSONSource)?.setData(markerGeoJSON);
    (map.getSource("circle") as GeoJSONSource)?.setData(circleGeoJSON);
  }, [markerGeoJSON, circleGeoJSON]);

  const containerClassName = `w-full ${fullHeight ? "h-full flex-1" : "h-[300px]"} rounded-lg overflow-hidden effect-inset`;

  return <div ref={containerRef} className={containerClassName} />;
};

/** @deprecated Use NodeLocationMap */
export const GoogleMap = NodeLocationMap;
