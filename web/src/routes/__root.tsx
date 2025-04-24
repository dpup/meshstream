import { Outlet } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAppDispatch } from "../hooks";
import { Nav } from "../components";
import { streamPackets, StreamEvent } from "../lib/api";
import { processNewPacket } from "../store/slices/aggregatorSlice";
import { createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const dispatch = useAppDispatch();
  const [connectionStatus, setConnectionStatus] = useState<string>("Connecting...");
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    // Connection management
    let reconnectTimer: number | null = null;
    const MAX_RECONNECT_DELAY = 10000; // Maximum reconnect delay in ms (10 seconds)
    const INITIAL_RECONNECT_DELAY = 1000; // Start with 1 second

    // Calculate exponential backoff delay with a cap
    const getReconnectDelay = (attempts: number) => {
      const delay = Math.min(
        INITIAL_RECONNECT_DELAY * Math.pow(1.5, attempts),
        MAX_RECONNECT_DELAY
      );
      return delay;
    };

    const connectToEventStream = () => {
      // Log connection attempt
      const attemptNum = connectionAttempts + 1;
      console.log(`[SSE] Connection attempt ${attemptNum}${isReconnecting ? ' (reconnecting)' : ''}`);
      
      // Set up Server-Sent Events connection
      const cleanup = streamPackets(
        // Event handler for all event types
        (event: StreamEvent) => {
          if (event.type === "info") {
            // Handle info events (connection status, etc.)
            console.log(`[SSE] Info: ${event.data}`);
            setConnectionStatus(event.data);
            
            // Reset connection attempts on successful connection
            if (event.data.includes("Connected") && isReconnecting) {
              console.log("[SSE] Connection restored successfully");
              setConnectionAttempts(0);
              setIsReconnecting(false);
            }
          } else if (event.type === "message") {
            // Process message for the aggregator
            dispatch(processNewPacket(event.data));
          } else if (event.type === "bad_data") {
            console.warn("[SSE] Received bad data:", event.data);
          }
        },
        // On error handler
        (error) => {
          console.error("[SSE] Connection error:", error);
          setConnectionStatus("Connection error. Reconnecting...");
          setIsReconnecting(true);
          
          // Increment connection attempts
          const newAttempts = connectionAttempts + 1;
          setConnectionAttempts(newAttempts);
          
          // Calculate backoff delay
          const reconnectDelay = getReconnectDelay(newAttempts);
          console.log(`[SSE] Will attempt to reconnect in ${reconnectDelay}ms (attempt ${newAttempts})`);
          
          // Close the current connection
          cleanup();
          
          // Schedule reconnection
          reconnectTimer = window.setTimeout(() => {
            connectToEventStream();
          }, reconnectDelay);
        }
      );
      
      // Return cleanup function 
      return () => {
        if (reconnectTimer) {
          window.clearTimeout(reconnectTimer);
        }
        cleanup();
      };
    };

    // Initial connection
    const cleanupFn = connectToEventStream();
    
    // Cleanup when component unmounts
    return cleanupFn;
  }, [dispatch, connectionAttempts, isReconnecting]);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-900">
      <Nav connectionStatus={connectionStatus} />
      <main className="ml-64 flex-1 py-6 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
