import { Outlet } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAppDispatch } from "../hooks";
import { Nav } from "../components";
import { streamPackets, StreamEvent, ConnectionInfoEvent } from "../lib/api";
import { processNewPacket } from "../store/slices/aggregatorSlice";
import { addPacket } from "../store/slices/packetSlice";
import { updateConnectionInfo, updateConnectionStatus } from "../store/slices/connectionSlice";
import { createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const dispatch = useAppDispatch();
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Connecting...");

  // Use refs instead of state for tracking reconnection status
  // This way changes to these values won't trigger useEffect reruns
  const connectionAttemptsRef = useRef(0);
  const isReconnectingRef = useRef(false);

  useEffect(() => {
    console.log("[SSE] Setting up event source");

    // Set up Server-Sent Events connection
    const cleanup = streamPackets(
      // Event handler for all event types
      (event: StreamEvent) => {
        if (event.type === "info") {
          // Handle info events (connection status, etc.)
          console.log(`[SSE] Info: ${event.data}`);
          setConnectionStatus(event.data);

          // Reset connection attempts on successful connection
          if (event.data.includes("Connected") && isReconnectingRef.current) {
            console.log("[SSE] Connection restored successfully");
            connectionAttemptsRef.current = 0;
            isReconnectingRef.current = false;
            
            // Update connection status in Redux
            dispatch(updateConnectionStatus(true));
          }
        } else if (event.type === "connection_info") {
          // Handle connection info events
          console.log("[SSE] Connection info received:", event.data);
          
          // Update connection info in Redux
          dispatch(updateConnectionInfo((event as ConnectionInfoEvent).data));
          
          // Update UI connection status
          setConnectionStatus(`Connected to ${event.data.mqttServer}`);
        } else if (event.type === "message") {
          // Process message for both the aggregator and packet display
          dispatch(processNewPacket(event.data));
          dispatch(addPacket(event.data));
        } else if (event.type === "bad_data") {
          console.warn("[SSE] Received bad data:", event.data);
        }
      },
      // On error handler - only for reporting UI state
      (error) => {
        console.error("[SSE] Connection error:", error);
        setConnectionStatus("Connection error. Reconnecting...");
        isReconnectingRef.current = true;

        // Update connection status in Redux
        dispatch(updateConnectionStatus(false));

        // Increment connection attempts for UI tracking
        connectionAttemptsRef.current += 1;
        console.log(
          `[SSE] Connection attempt ${connectionAttemptsRef.current}`
        );
      }
    );

    // This cleanup will only be called when the component unmounts
    return cleanup;
  }, [dispatch]);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-900">
      <Nav connectionStatus={connectionStatus} />
      <main className="ml-64 flex-1 py-6 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
