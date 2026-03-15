import React, { useMemo } from "react";
import ReactMap, { Source, Layer } from "react-map-gl/maplibre";
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
  const accuracyMeters = calculateAccuracyFromPrecisionBits(precisionBits);
  const effectiveZoom = zoom ?? calculateZoomFromAccuracy(accuracyMeters);
  const showCenterDot = precisionBits === undefined || accuracyMeters < 100;

  const markerGeoJSON = useMemo((): FeatureCollection => ({
    type: "FeatureCollection",
    features: showCenterDot
      ? [{ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} }]
      : [],
  }), [lat, lng, showCenterDot]);

  const circleGeoJSON = useMemo((): FeatureCollection => ({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [buildCircleCoords(lng, lat, accuracyMeters)] },
        properties: {},
      },
    ],
  }), [lat, lng, accuracyMeters]);

  const containerClassName = `w-full ${fullHeight ? "h-full flex-1" : "min-h-[300px]"} rounded-lg overflow-hidden effect-inset`;

  return (
    <div className={containerClassName}>
      <ReactMap
        mapStyle={CARTO_DARK_STYLE}
        initialViewState={{ longitude: lng, latitude: lat, zoom: effectiveZoom }}
        style={{ width: "100%", height: "100%" }}
      >
        <Source id="circle" type="geojson" data={circleGeoJSON}>
          <Layer
            id="circle-fill"
            type="fill"
            paint={{ "fill-color": "#4ade80", "fill-opacity": 0.15 }}
          />
          <Layer
            id="circle-outline"
            type="line"
            paint={{ "line-color": "#22c55e", "line-width": 2, "line-opacity": 0.8 }}
          />
        </Source>

        <Source id="marker" type="geojson" data={markerGeoJSON}>
          <Layer
            id="marker-dot"
            type="circle"
            paint={{
              "circle-radius": 6,
              "circle-color": "#4ade80",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#22c55e",
              "circle-opacity": 1,
            }}
          />
        </Source>
      </ReactMap>
    </div>
  );
};

/** @deprecated Use NodeLocationMap */
export const GoogleMap = NodeLocationMap;
