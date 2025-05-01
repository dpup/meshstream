import React from "react";
import { getStaticMapUrl, getGoogleMapsUrl } from "../lib/mapUtils";

interface MapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  width?: number;
  height?: number;
  caption?: string;
  className?: string;
  flush?: boolean;
  nightMode?: boolean;
  precisionBits?: number; // Added for position precision
}

// Helper function to calculate zoom level based on precision bits
const calculateZoomFromPrecisionBits = (precisionBits?: number): number => {
  if (!precisionBits) return 14; // Default zoom
  
  // Each precision bit roughly halves the area, so we can map bits to zoom level
  // Starting with Earth at zoom 0, each bit roughly adds 1 zoom level
  // Typical values: 21 bits ~= zoom 13-14, 24 bits ~= zoom 16-17
  const baseZoom = 8; // Start with a basic zoom level
  const additionalZoom = Math.max(0, precisionBits - 16); // Each 2 bits above 16 adds ~1 zoom level
  
  return Math.min(18, baseZoom + (additionalZoom / 2)); // Cap at zoom 18
};

export const Map: React.FC<MapProps> = ({
  latitude,
  longitude,
  zoom,
  width = 300,
  height = 200,
  caption,
  className = "",
  flush = false,
  nightMode = true,
  precisionBits
}) => {
  // Calculate zoom level based on precision bits if zoom is not provided
  const effectiveZoom = zoom || calculateZoomFromPrecisionBits(precisionBits);
  
  const mapUrl = getStaticMapUrl(
    latitude, 
    longitude, 
    effectiveZoom, 
    width, 
    height, 
    nightMode,
    precisionBits
  );
  const googleMapsUrl = getGoogleMapsUrl(latitude, longitude);
  
  // Check if Google Maps API key is available
  const apiKeyAvailable = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

  const mapContainerClasses = flush 
    ? `w-full h-full overflow-hidden relative ${className}`
    : `${className} relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-800/50`;
  
  if (!apiKeyAvailable) {
    return (
      <div className={flush ? "p-4 bg-neutral-800/50" : mapContainerClasses}>
        <p className="text-sm text-neutral-400">
          Map display requires a Google Maps API key.
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          Add VITE_GOOGLE_MAPS_API_KEY to your environment.
        </p>
        <div className="mt-2 text-sm text-neutral-300">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      </div>
    );
  }
  
  return (
    <div className={mapContainerClasses}>
      <a 
        href={googleMapsUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block w-full h-full hover:opacity-90 transition-opacity"
      >
        <img 
          src={mapUrl} 
          alt={`Map of ${latitude},${longitude}`} 
          className="w-full h-full object-cover"
        />
        {caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1 text-xs text-white">
            {caption}
          </div>
        )}
      </a>
    </div>
  );
};