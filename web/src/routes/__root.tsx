import { Outlet } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Nav } from "../components";
import { streamPackets, StreamEvent } from "../lib/api";

export default function Root() {
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Connecting...");

  useEffect(() => {
    // Set up Server-Sent Events connection
    const cleanup = streamPackets(
      // Event handler for all event types
      (event: StreamEvent) => {
        if (event.type === "info") {
          // Handle info events (connection status, etc.)
          setConnectionStatus(event.data);
        }
      },
      // On error
      () => {
        setConnectionStatus("Connection error. Reconnecting...");
      }
    );

    // Clean up connection when component unmounts
    return cleanup;
  }, []);

  return (
    <div className="flex min-h-screen bg-neutral-800">
      {/* Sidebar Navigation */}
      <Nav connectionStatus={connectionStatus} />
      
      {/* Main Content Area */}
      <main className="ml-64 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}