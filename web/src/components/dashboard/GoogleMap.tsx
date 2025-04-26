import React, { useRef, useEffect } from "react";
import { calculateAccuracyFromPrecisionBits, calculateZoomFromAccuracy } from "../../lib/mapUtils";

interface GoogleMapProps {
  /** Latitude coordinate */
  lat: number;
  /** Longitude coordinate */
  lng: number;
  /** Optional zoom level (1-20) */
  zoom?: number;
  /** Precision bits used for accuracy calculation */
  precisionBits?: number;
}

/**
 * Google Maps component that uses the API loaded via script tag
 */
export const GoogleMap: React.FC<GoogleMapProps> = ({
  lat,
  lng,
  zoom,
  precisionBits,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Calculate accuracy in meters based on precision bits
  const accuracyMeters = calculateAccuracyFromPrecisionBits(precisionBits);

  // If zoom is not provided, calculate based on accuracy
  const effectiveZoom = zoom || calculateZoomFromAccuracy(accuracyMeters);

  useEffect(() => {
    if (mapRef.current && window.google && window.google.maps) {
      // Create map instance
      const mapOptions: google.maps.MapOptions = {
        center: { lat, lng },
        zoom: effectiveZoom,
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

      mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions);

      // Only add the center marker if we don't have precision information or
      // it's very accurate.
      if (precisionBits === undefined || accuracyMeters < 100) {
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
      }

      // Circle will always be shown, using default 300m accuracy if no
      // precision bits.
      new google.maps.Circle({
        strokeColor: "#22c55e",
        strokeOpacity: 0.8,
        strokeWeight: 2.5,
        fillColor: "#4ade80",
        fillOpacity: 0.4,
        map: mapInstanceRef.current,
        center: { lat, lng },
        radius: accuracyMeters,
      });
    }
  }, [lat, lng, effectiveZoom, accuracyMeters, precisionBits]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full min-h-[300px] rounded-lg overflow-hidden effect-inset"
    />
  );
};
