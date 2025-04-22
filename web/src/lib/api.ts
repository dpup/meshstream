/**
 * API client functions for interacting with the Meshstream server
 */
import { API_ENDPOINTS } from "./config";
import {
  Packet,
  StreamEvent,
  StreamEventHandler,
  InfoEvent,
  MessageEvent,
  BadDataEvent,
} from "./types";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/**
 * Fetch a list of the most recent packets from the server
 */
export async function fetchRecentPackets(): Promise<ApiResponse<Packet[]>> {
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

// Re-export types
export type { 
  InfoEvent, 
  MessageEvent, 
  BadDataEvent, 
  StreamEvent,
  StreamEventHandler,
};

/**
 * Establish a Server-Sent Events connection to receive real-time packets
 */
export function streamPackets(
  onEvent: StreamEventHandler,
  onError?: (error: Event) => void
): () => void {
  const evtSource = new EventSource(API_ENDPOINTS.STREAM);

  // Handle info events specifically
  evtSource.addEventListener("info", (event) => {
    // Info events are just strings
    onEvent({
      type: "info",
      data: event.data,
    });
  });

  // Handle message events specifically
  evtSource.addEventListener("message", (event) => {
    handleEventData(event.data, onEvent);
  });

  // Handle errors
  if (onError) {
    evtSource.onerror = onError;
  } else {
    evtSource.onerror = () => {
      console.error("EventSource failed");
      evtSource.close();
    };
  }

  // Return cleanup function
  return () => evtSource.close();
}

/**
 * Helper to handle event data based on type
 */
function handleEventData(data: string, callback: StreamEventHandler): void {
  try {
    const parsedData = JSON.parse(data) as Packet;

    callback({
      type: "message",
      data: parsedData,
    });
  } catch (error) {
    console.warn("Failed to parse message as JSON:", error, "Raw data:", data);
    callback({
      type: "bad_data",
      data,
    });
  }
}