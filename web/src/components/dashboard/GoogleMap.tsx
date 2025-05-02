import React, { useRef, useEffect, useState, useCallback } from "react";
import { calculateAccuracyFromPrecisionBits, calculateZoomFromAccuracy } from "../../lib/mapUtils";
import { GOOGLE_MAPS_ID } from "../../lib/config";

interface GoogleMapProps {
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
 * Google Maps component that uses the API loaded via script tag
 */
export const GoogleMap: React.FC<GoogleMapProps> = ({
  lat,
  lng,
  zoom,
  precisionBits,
  fullHeight = false,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Calculate accuracy in meters based on precision bits
  const accuracyMeters = calculateAccuracyFromPrecisionBits(precisionBits);

  // If zoom is not provided, calculate based on accuracy
  const effectiveZoom = zoom || calculateZoomFromAccuracy(accuracyMeters);

  // Track whether the map has been initialized
  const isInitializedRef = useRef(false);

  const initializeMap = useCallback(() => {
    if (
      mapRef.current && 
      window.google && 
      window.google.maps && 
      !isInitializedRef.current
    ) {
      isInitializedRef.current = true;
      // Create map instance
      const mapOptions: google.maps.MapOptions = {
        center: { lat, lng },
        zoom: effectiveZoom,
        mapTypeId: google.maps.MapTypeId.HYBRID,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        mapId: GOOGLE_MAPS_ID,
      };

      mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions);

      // Only add the center marker if we don't have precision information or
      // it's very accurate.
      if (precisionBits === undefined || accuracyMeters < 100) {
        // Create a marker with a custom SVG circle to match the old style
        const markerContent = document.createElement('div');
        markerContent.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="6" fill="#4ade80" stroke="#22c55e" stroke-width="2" />
          </svg>
        `;
        
        // Create the advanced marker element
        markerRef.current = new google.maps.marker.AdvancedMarkerElement({
          position: { lat, lng },
          map: mapInstanceRef.current,
          title: `Node Position`,
          content: markerContent,
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
  
  // Check for Google Maps API loading - make sure all required objects are available
  useEffect(() => {
    // Function to check if all required Google Maps components are loaded
    const checkGoogleMapsLoaded = () => {
      return window.google && 
             window.google.maps && 
             window.google.maps.Map && 
             window.google.maps.Circle && 
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
  
  // Initialize map when Google Maps is loaded and props change
  useEffect(() => {
    if (isGoogleMapsLoaded && mapRef.current) {
      initializeMap();
    }
  }, [isGoogleMapsLoaded, initializeMap]);

  // Prepare the container classes based on fullHeight flag
  const containerClassName = `w-full ${fullHeight ? 'h-full flex-1' : 'min-h-[300px]'} rounded-lg overflow-hidden effect-inset`;

  if (!isGoogleMapsLoaded) {
    return (
      <div className={`${containerClassName} flex items-center justify-center`}>
        <div className="text-gray-400">Loading map...</div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={containerClassName}
    />
  );
};
