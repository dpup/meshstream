/**
 * Utility functions for working with maps and coordinates
 */

/**
 * Calculate the position accuracy in meters using precision bits
 * @param precisionBits Number of precision bits used in position encoding
 * @returns Accuracy radius in meters
 */
export const calculateAccuracyFromPrecisionBits = (
  precisionBits?: number
): number => {
  if (!precisionBits) return 300; // Default accuracy of 300m

  // Each precision bit halves the accuracy radius
  // Starting with Earth's circumference (~40075km), calculate the precision
  // For reference: 24 bits = ~2.4m accuracy, 21 bits = ~19m accuracy
  const earthCircumference = 40075000; // in meters
  const accuracy = earthCircumference / 2 ** precisionBits / 2;

  // Limit to reasonable values
  return Math.max(1, Math.min(accuracy, 10000));
};

/**
 * Calculate appropriate zoom level based on accuracy
 * @param accuracyMeters Accuracy in meters
 * @returns Zoom level (1-20)
 */
export const calculateZoomFromAccuracy = (accuracyMeters: number): number => {
  // Roughly map accuracy to zoom level (higher accuracy = higher zoom)
  // < 10m: zoom 18
  // < 50m: zoom 16
  // < 100m: zoom 15
  // < 500m: zoom 14
  // < 1km: zoom 13
  // < 5km: zoom 11
  // >= 5km: zoom 10
  if (accuracyMeters < 10) return 18;
  if (accuracyMeters < 50) return 16;
  if (accuracyMeters < 100) return 15;
  if (accuracyMeters < 500) return 14;
  if (accuracyMeters < 1000) return 13;
  if (accuracyMeters < 5000) return 11;
  return 10;
};

/**
 * Generate a Google Maps Static API URL for a given latitude and longitude
 * @param latitude The latitude in decimal degrees
 * @param longitude The longitude in decimal degrees
 * @param zoom The zoom level (1-20)
 * @param width The image width in pixels
 * @param height The image height in pixels
 * @param nightMode Whether to use dark styling for the map
 * @param precisionBits Optional precision bits to determine how to display the marker
 * @returns A URL string for the Google Maps Static API
 */
export const getStaticMapUrl = (
  latitude: number,
  longitude: number,
  zoom: number = 15,
  width: number = 300,
  height: number = 200,
  nightMode: boolean = true,
  precisionBits?: number
): string => {
  // Get API key from environment variable
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  // Build the URL
  const mapUrl = new URL("https://maps.googleapis.com/maps/api/staticmap");

  // Add parameters
  mapUrl.searchParams.append("center", `${latitude},${longitude}`);
  mapUrl.searchParams.append("zoom", zoom.toString());
  mapUrl.searchParams.append("size", `${width}x${height}`);
  mapUrl.searchParams.append("key", apiKey);
  mapUrl.searchParams.append("format", "png");
  mapUrl.searchParams.append("scale", "2"); // Retina display support

  // Only add marker if we don't have precision information
  if (precisionBits === undefined) {
    mapUrl.searchParams.append(
      "markers",
      `color:green|${latitude},${longitude}`
    );
  }
  // With static maps we can't draw circles directly, so we use a marker with different color
  // even when we have precision information, but we'll show it differently in the interactive map
  else {
    mapUrl.searchParams.append(
      "markers",
      `color:green|${latitude},${longitude}`
    );
  }

  // Apply night mode styling using the simpler approach
  if (nightMode) {
    mapUrl.searchParams.append("style", "invert_lightness:true");
  }

  return mapUrl.toString();
};

/**
 * Create a Google Maps URL to open the location in Google Maps
 */
export const getGoogleMapsUrl = (
  latitude: number,
  longitude: number
): string => {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};
