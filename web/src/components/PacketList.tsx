import React, { useState, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "../hooks";
import { PacketRenderer } from "./packets/PacketRenderer";
import { StreamControl } from "./StreamControl";
import { Trash2, RefreshCw, Archive } from "lucide-react";
import { clearPackets, toggleStreamPause } from "../store/slices/packetSlice";
import { Packet } from "../lib/types";
import { Separator } from "./Separator";

// Number of packets to show per page
const PACKETS_PER_PAGE = 100;

export const PacketList: React.FC = () => {
  const { packets, bufferedPackets, loading, error, streamPaused } =
    useAppSelector((state) => state.packets);
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);

  // Generate a reproducible hash code for a string
  const hashString = useCallback((str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Make sure hash is always positive and convert to string
    return Math.abs(hash).toString(36);
  }, []);

  // Create a packet key using data.id and from address
  // This should match the key generation logic in the reducer
  const createPacketKey = useCallback(
    (packet: Packet): string => {
      if (packet.data.id !== undefined && packet.data.from !== undefined) {
        // Use Meshtastic node ID format (! followed by lowercase hex) and packet ID
        const nodeId = `!${packet.data.from.toString(16).toLowerCase()}`;
        return `${nodeId}_${packet.data.id}`;
      } else {
        // Fallback to hash-based key if no ID or from (should be rare)
        return `hash_${hashString(JSON.stringify(packet))}`;
      }
    },
    [hashString]
  );

  // We don't need to track packet keys in state anymore since we use data.id
  // and it's deterministic - removing this effect to prevent the infinite loop issue

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-40 text-neutral-300">
        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-400 border border-red-800 rounded bg-neutral-900">
        Error: {error}
      </div>
    );
  }

  if (packets.length === 0 && bufferedPackets.length === 0) {
    return (
      <div className="p-6 text-neutral-400 text-center border border-neutral-700 rounded bg-neutral-900">
        No packets received yet
      </div>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(packets.length / PACKETS_PER_PAGE);
  const startIndex = (currentPage - 1) * PACKETS_PER_PAGE;
  const endIndex = startIndex + PACKETS_PER_PAGE;
  const currentPackets = packets.slice(startIndex, endIndex);

  const handleClearPackets = () => {
    if (window.confirm("Are you sure you want to clear all packets?")) {
      dispatch(clearPackets());
      setCurrentPage(1);
    }
  };

  const handleToggleStream = () => {
    dispatch(toggleStreamPause());
    // When unpausing with buffered packets, reset to first page to see new content
    if (streamPaused && bufferedPackets.length > 0) {
      setCurrentPage(1);
    }
  };

  // Get the key for a packet - directly use createPacketKey
  const getPacketKey = (packet: Packet, index: number): string => {
    return createPacketKey(packet) || `fallback_${index}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm text-neutral-400 px-2">
          {packets.length} packets received, since 6:00am
        </div>
        <div className="flex items-center space-x-3">
          {/* Show buffered count when paused */}
          {streamPaused && bufferedPackets.length > 0 && (
            <div className="flex items-center text-sm text-amber-400">
              <Archive className="h-4 w-4 mr-1.5" />
              {bufferedPackets.length} new
            </div>
          )}

          {/* Stream control toggle */}
          <StreamControl
            isPaused={streamPaused}
            onToggle={handleToggleStream}
          />

          {/* Clear button */}
          <button
            onClick={handleClearPackets}
            className="flex items-center space-x-2 px-3 py-1.5 effect-outset border border-neutral-950/90 rounded-md text-neutral-400 hover:bg-neutral-700/50"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            <span className="text-sm font-medium">Clear</span>
          </button>
        </div>
      </div>
      <Separator className="mx-0" />

      <ul className="space-y-12">
        {currentPackets.map((packet, index) => (
          <li key={getPacketKey(packet, index)}>
            <PacketRenderer packet={packet} />
          </li>
        ))}
      </ul>

      {/* Empty state when no packets are visible but stream is paused */}
      {packets.length === 0 && streamPaused && bufferedPackets.length > 0 && (
        <div className="p-6 text-amber-400 text-center border border-amber-900 bg-neutral-800 rounded my-4">
          Stream is paused with {bufferedPackets.length} buffered messages.
          <button
            onClick={handleToggleStream}
            className="block mx-auto mt-2 px-3 py-1.5 text-sm bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
          >
            Resume to view
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 text-sm">
          <button
            onClick={() =>
              setCurrentPage(currentPage > 1 ? currentPage - 1 : 1)
            }
            disabled={currentPage === 1}
            className={`px-3 py-1.5 rounded ${
              currentPage === 1
                ? "text-neutral-500 cursor-not-allowed"
                : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"
            }`}
          >
            Previous
          </button>

          <div className="text-neutral-400">
            Page {currentPage} of {totalPages}
          </div>

          <button
            onClick={() =>
              setCurrentPage(
                currentPage < totalPages ? currentPage + 1 : totalPages
              )
            }
            disabled={currentPage === totalPages}
            className={`px-3 py-1.5 rounded ${
              currentPage === totalPages
                ? "text-neutral-500 cursor-not-allowed"
                : "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
