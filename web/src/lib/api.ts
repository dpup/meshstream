/**
 * API client functions for interacting with the Meshstream server
 */
import { getStreamEndpoint } from "./config";
import {
  Packet,
  StreamEvent,
  StreamEventHandler,
  InfoEvent,
  MessageEvent,
  PaddingEvent,
  BadDataEvent,
} from "./types";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Connection info event type
export interface ConnectionInfoEvent {
  type: "connection_info";
  data: {
    mqttServer: string;
    mqttTopic: string;
    connected: boolean;
    serverTime?: number;
    message?: string;
  };
}

// Re-export types
export type {
  InfoEvent,
  MessageEvent,
  BadDataEvent,
  StreamEvent,
  PaddingEvent,
  StreamEventHandler,
};

/**
 * Establish a Server-Sent Events connection to receive real-time packets
 * with automatic reconnection
 * 
 * @param onEvent Handler function for stream events (messages, info, errors)
 * @param onError Optional handler for connection errors
 * @returns A function that closes the connection when called
 */
export function streamPackets(
  onEvent: StreamEventHandler,
  onError?: (error: Event) => void
): () => void {
  // Connection state
  let source: EventSource | null = null;
  let reconnectTimer: number | null = null;
  let shouldReconnect = true;
  let reconnectAttempt = 0;
  
  // Reconnection settings
  const INITIAL_RECONNECT_DELAY = 1000; // 1 second
  const MAX_RECONNECT_DELAY = 30000;    // 30 seconds
  const MAX_RECONNECT_ATTEMPTS = 30;    // Give up after this many attempts
  
  /**
   * Calculate delay for exponential backoff
   */
  function getReconnectDelay(): number {
    // Calculate exponential backoff: 1s, 2s, 4s, 8s, etc. up to max
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempt),
      MAX_RECONNECT_DELAY
    );
    
    return delay;
  }
  
  /**
   * Clean up the current connection and timers
   */
  function cleanup(): void {
    // Clear any pending reconnect timer
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    // Close and cleanup the event source if it exists
    if (source !== null) {
      // Remove all event listeners
      source.removeEventListener("message", handleMessage as EventListener);
      source.removeEventListener("info", handleInfo as EventListener);
      source.removeEventListener("connection_info", handleConnectionInfo as EventListener);
      source.onerror = null;
      
      // Close the connection
      source.close();
      source = null;
    }
  }
  
  /**
   * Handle info events
   */
  function handleInfo(event: Event): void {
    const evtData = (event as any).data;
    // If we receive an info event, connection is working
    if (reconnectAttempt > 0) {
      console.log("[SSE] Connection restored");
      reconnectAttempt = 0;
    }
    
    // Forward the event to the caller
    onEvent({
      type: "info",
      data: String(evtData),
    });
  }

  /**
   * Handle connection info events
   */
  function handleConnectionInfo(event: Event): void {
    const evtData = (event as any).data;
    try {
      // Parse the connection info JSON
      const parsedData = JSON.parse(String(evtData));
      
      // Forward the connection info to the caller
      onEvent({
        type: "connection_info",
        data: parsedData,
      });
    } catch (error) {
      console.warn("[SSE] Failed to parse connection info:", error);
    }
  }
  
  /**
   * Handle message events
   */
  function handleMessage(event: Event): void {
    const evtData = (event as any).data;
    try {
      // Parse the event data as JSON
      const parsedData = JSON.parse(String(evtData)) as Packet;
      
      // Forward the message to the caller
      onEvent({
        type: "message",
        data: parsedData,
      });
    } catch (error) {
      console.warn("[SSE] Failed to parse message:", error);
      
      // Forward bad data to the caller
      onEvent({
        type: "bad_data",
        data: String(evtData),
      });
    }
  }
  
  /**
   * Handle connection errors and reconnection
   */
  function handleError(event: Event): void {
    // Log the error
    console.error("[SSE] Connection error");
    
    // Notify the caller
    if (onError) {
      onError(event);
    }
    
    // Clean up the current connection
    cleanup();
    
    // Reconnect if we should
    if (shouldReconnect && reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempt++;
      
      // Calculate backoff delay
      const delay = getReconnectDelay();
      console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempt})`);
      
      // Schedule reconnection
      reconnectTimer = window.setTimeout(connect, delay);
    } else if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[SSE] Giving up after ${MAX_RECONNECT_ATTEMPTS} failed reconnection attempts`);
    }
  }
  
  /**
   * Connect to the event stream
   */
  function connect(): void {
    // Clean up any existing connection first
    cleanup();
    
    // Don't continue if we're no longer supposed to reconnect
    if (!shouldReconnect) {
      return;
    }
    
    try {
      // Create a new EventSource connection using dynamic endpoint
      source = new EventSource(getStreamEndpoint());
      
      // Log connection attempt
      if (reconnectAttempt === 0) {
        console.log("[SSE] Connecting to stream");
      } else {
        console.log(`[SSE] Reconnecting to stream (attempt ${reconnectAttempt})`);
      }
      
      // Set up event handlers
      source.addEventListener("info", handleInfo as EventListener);
      source.addEventListener("message", handleMessage as EventListener);
      source.addEventListener("connection_info", handleConnectionInfo as EventListener);
      source.onerror = handleError;
    } catch (error) {
      console.error("[SSE] Failed to create EventSource:", error);
      handleError(new Event("error"));
    }
  }
  
  // Start the initial connection
  connect();
  
  /**
   * Return a function that will close the connection when called
   */
  return function close(): void {
    console.log("[SSE] Closing connection permanently");
    
    // Set flag to prevent reconnection
    shouldReconnect = false;
    
    // Clean up resources
    cleanup();
  };
}