import React, { useRef, useState, useEffect, useMemo } from "react";
import maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { CARTO_DARK_STYLE } from "../lib/mapStyle";
import { buildCircleCoords, calculateAccuracyFromPrecisionBits, calculateZoomFromAccuracy, getGoogleMapsUrl } from "../lib/mapUtils";

interface LocationMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  caption?: string;
  className?: string;
  flush?: boolean;
  precisionBits?: number;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  latitude,
  longitude,
  zoom,
  caption,
  className = "",
  flush = false,
  precisionBits,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Only mount the WebGL map when the container enters the viewport.
  // This prevents exhausting the browser's WebGL context limit (~8-16)
  // when many LocationMap thumbnails are rendered in a long packet list.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const accuracyMeters = calculateAccuracyFromPrecisionBits(precisionBits);
  const effectiveZoom = zoom ?? calculateZoomFromAccuracy(accuracyMeters);
  const googleMapsUrl = getGoogleMapsUrl(latitude, longitude);
  const showAccuracyCircle = precisionBits !== undefined;

  const markerGeoJSON = useMemo((): FeatureCollection => ({
    type: "FeatureCollection",
    features: [
      { type: "Feature", geometry: { type: "Point", coordinates: [longitude, latitude] }, properties: {} },
    ],
  }), [latitude, longitude]);

  const circleGeoJSON = useMemo((): FeatureCollection => ({
    type: "FeatureCollection",
    features: showAccuracyCircle
      ? [{
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [buildCircleCoords(longitude, latitude, accuracyMeters)] },
          properties: {},
        }]
      : [],
  }), [latitude, longitude, accuracyMeters, showAccuracyCircle]);

  // Mount map when visible, destroy when hidden
  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_DARK_STYLE,
      center: [longitude, latitude],
      zoom: effectiveZoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    map.on("load", () => {
      if (showAccuracyCircle) {
        map.addSource("circle", { type: "geojson", data: circleGeoJSON });
        map.addLayer({ id: "circle-fill", type: "fill", source: "circle", paint: { "fill-color": "#4ade80", "fill-opacity": 0.15 } });
        map.addLayer({ id: "circle-outline", type: "line", source: "circle", paint: { "line-color": "#22c55e", "line-width": 1.5, "line-opacity": 0.8 } });
      }

      map.addSource("marker", { type: "geojson", data: markerGeoJSON });
      map.addLayer({ id: "marker-dot", type: "circle", source: "marker", paint: {
        "circle-radius": 5,
        "circle-color": "#4ade80",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#22c55e",
      }});
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // Update source data when coordinates change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    (map.getSource("marker") as GeoJSONSource)?.setData(markerGeoJSON);
    if (showAccuracyCircle) {
      (map.getSource("circle") as GeoJSONSource)?.setData(circleGeoJSON);
    }
  }, [markerGeoJSON, circleGeoJSON, showAccuracyCircle]);

  const containerClasses = flush
    ? `w-full h-full overflow-hidden relative ${className}`
    : `${className} relative overflow-hidden rounded-xl border border-neutral-700 bg-neutral-800/50`;

  return (
    <div ref={containerRef} className={containerClasses}>
      {/* External link overlay */}
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded hover:bg-black/70 transition-colors z-10"
        title="Open in Google Maps"
      >
        ↗
      </a>

      {caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1 text-xs text-white z-10">
          {caption}
        </div>
      )}
    </div>
  );
};

/** @deprecated Use LocationMap */
export const Map = LocationMap;
