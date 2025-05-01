/**
 * Application configuration, pulling from environment variables
 */

// Environment type
export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;
export const APP_ENV = import.meta.env.VITE_APP_ENV || "development";

// Site configuration
export const SITE_TITLE = import.meta.env.VITE_SITE_TITLE || "My Mesh";
export const SITE_DESCRIPTION =
  import.meta.env.VITE_SITE_DESCRIPTION ||
  "Realtime Meshtastic activity via MQTT.";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
export const GOOGLE_MAPS_ID = import.meta.env.VITE_GOOGLE_MAPS_ID || "demo-map-id";
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// API endpoints
export const API_ENDPOINTS = {
  STREAM: `${API_BASE_URL}/api/stream`,
};

/**
 * Get the API endpoint for the stream
 */
export function getStreamEndpoint(): string {
  return API_ENDPOINTS.STREAM;
}
