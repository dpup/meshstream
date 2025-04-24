/**
 * Application configuration, pulling from environment variables
 */

// Environment type
export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;
export const APP_ENV = import.meta.env.VITE_APP_ENV || 'development';

// Site configuration
export const SITE_TITLE = import.meta.env.VITE_SITE_TITLE || 'ERSN Mesh';

// API URL configuration
const getApiBaseUrl = (): string => {
  // In production, use the same domain (empty string base URL)
  if (IS_PROD) {
    return import.meta.env.VITE_API_BASE_URL || '';
  }
  
  // In development, use the configured base URL with fallback
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
};

export const API_BASE_URL = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
  STREAM: `${API_BASE_URL}/api/stream`,
};