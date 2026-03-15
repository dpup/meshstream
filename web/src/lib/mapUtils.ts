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
 * Approximate a geographic circle as a GeoJSON polygon ring.
 * @param lng Center longitude
 * @param lat Center latitude
 * @param radiusMeters Radius in meters
 * @param points Number of polygon vertices (more = smoother)
 */
export function buildCircleCoords(
  lng: number,
  lat: number,
  radiusMeters: number,
  points = 64
): [number, number][] {
  const earthRadius = 6371000;
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);
    const pLat = lat + (dy / earthRadius) * (180 / Math.PI);
    const pLng = lng + (dx / (earthRadius * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
    coords.push([pLng, pLat]);
  }
  coords.push(coords[0]); // close the ring
  return coords;
}

/**
 * Create a Google Maps URL to open the location in Google Maps
 */
export const getGoogleMapsUrl = (
  latitude: number,
  longitude: number
): string => {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};
