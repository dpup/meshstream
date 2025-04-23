/**
 * Utility functions for working with maps and coordinates
 */

/**
 * Generate a Google Maps Static API URL for a given latitude and longitude
 * @param latitude The latitude in decimal degrees
 * @param longitude The longitude in decimal degrees
 * @param zoom The zoom level (1-20)
 * @param width The image width in pixels
 * @param height The image height in pixels
 * @param nightMode Whether to use dark styling for the map
 * @returns A URL string for the Google Maps Static API
 */
export const getStaticMapUrl = (
  latitude: number,
  longitude: number,
  zoom: number = 15,
  width: number = 300,
  height: number = 200,
  nightMode: boolean = true
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

  // Add marker
  mapUrl.searchParams.append("markers", `color:red|${latitude},${longitude}`);

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
