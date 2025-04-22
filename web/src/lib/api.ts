/**
 * API client functions for interacting with the Meshstream server
 */
import { API_ENDPOINTS } from './config';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/**
 * Fetch a list of the most recent packets from the server
 */
export async function fetchRecentPackets(): Promise<ApiResponse<any[]>> {
  try {
    const response = await fetch(API_ENDPOINTS.RECENT_PACKETS);
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Type definitions for SSE events
 */
export interface InfoEvent {
  type: 'info';
  data: string;
}

export interface MessageEvent {
  type: 'message';
  data: any; // Will be the parsed JSON message
}

export type StreamEvent = InfoEvent | MessageEvent;

export type StreamEventHandler = (event: StreamEvent) => void;

/**
 * Establish a Server-Sent Events connection to receive real-time packets
 */
export function streamPackets(
  onEvent: StreamEventHandler, 
  onError?: (error: Event) => void
): () => void {
  const evtSource = new EventSource(API_ENDPOINTS.STREAM);
  
  // Handle general messages (fallback)
  evtSource.onmessage = (event) => {
    handleEventData('message', event.data, onEvent);
  };
  
  // Handle info events specifically
  evtSource.addEventListener('info', (event) => {
    // Info events are just strings
    onEvent({
      type: 'info',
      data: event.data
    });
  });
  
  // Handle message events specifically
  evtSource.addEventListener('message', (event) => {
    handleEventData('message', event.data, onEvent);
  });
  
  // Handle errors
  if (onError) {
    evtSource.onerror = onError;
  } else {
    evtSource.onerror = () => {
      console.error('EventSource failed');
      evtSource.close();
    };
  }
  
  // Return cleanup function
  return () => evtSource.close();
}

/**
 * Helper to handle event data based on type
 */
function handleEventData(
  type: 'info' | 'message', 
  data: string, 
  callback: StreamEventHandler
): void {
  try {
    if (type === 'info') {
      // Info events are plain text
      callback({
        type: 'info',
        data
      });
    } else {
      // Message events are JSON
      try {
        const parsedData = JSON.parse(data);
        callback({
          type: 'message',
          data: parsedData
        });
      } catch (error) {
        // If JSON parsing fails, treat it as a plain text message
        console.warn('Failed to parse message as JSON:', error);
        callback({
          type: 'info',
          data
        });
      }
    }
  } catch (error) {
    console.error('Error handling event data:', error);
  }
}
