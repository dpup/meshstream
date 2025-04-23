import React, { useState, useEffect, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "../hooks";
import { PacketRenderer } from "./packets/PacketRenderer";
import { StreamControl } from "./StreamControl";
import { Trash2, RefreshCw, Archive } from "lucide-react";
import { clearPackets, toggleStreamPause } from "../store/slices/packetSlice";
import { Packet } from "../lib/types";

// Number of packets to show per page
const PACKETS_PER_PAGE = 10;

export const PacketList: React.FC = () => {
  const { packets, bufferedPackets, loading, error, streamPaused } = useAppSelector(
    (state) => state.packets
  );
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  
  // A unique ID is attached to each rendered packet element
  const [packetKeys, setPacketKeys] = useState<Record<string, string>>({});
  
  // Generate a reproducible hash code for a string
  const hashString = useCallback((str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Make sure hash is always positive and convert to string
    return Math.abs(hash).toString(36);
  }, []);
  
  // Create a consistent, unique fingerprint for a packet
  const createPacketFingerprint = useCallback((packet: Packet): string => {
    // Combine multiple fields to maximize uniqueness
    const parts = [
      packet.data.from?.toString() ?? 'unknown',
      packet.data.id?.toString() ?? 'noid',
      packet.data.portNum?.toString() ?? 'noport',
      packet.info.channel ?? 'nochannel',
      packet.info.userId ?? 'nouser',
      // Include a hash of raw JSON data for extra uniqueness
      hashString(JSON.stringify(packet)),
    ];
    return parts.join('_');
  }, [hashString]);
  
  // Update the packet keys whenever the packets change
  useEffect(() => {
    // Store new packet keys
    const newKeys: Record<string, string> = {...packetKeys};
    
    // Assign keys to any packets that don't already have them
    packets.forEach((packet) => {
      const fingerprint = createPacketFingerprint(packet);
      
      // Only create new keys for packets we haven't seen before
      if (!newKeys[fingerprint]) {
        const randomPart = Math.random().toString(36).substring(2, 10);
        newKeys[fingerprint] = `${fingerprint}_${randomPart}`;
      }
    });
    
    // Only update state if we actually added new keys
    if (Object.keys(newKeys).length !== Object.keys(packetKeys).length) {
      setPacketKeys(newKeys);
    }
  }, [packets, createPacketFingerprint]);

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
      // Clear the packet keys too
      setPacketKeys({});
    }
  };

  const handleToggleStream = () => {
    dispatch(toggleStreamPause());
    // When unpausing with buffered packets, reset to first page to see new content
    if (streamPaused && bufferedPackets.length > 0) {
      setCurrentPage(1);
    }
  };

  // Get the key for a packet
  const getPacketKey = (packet: Packet, index: number): string => {
    const fingerprint = createPacketFingerprint(packet);
    // Fallback to index-based key if no fingerprint key exists
    return packetKeys[fingerprint] || `packet_${index}_${Date.now()}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-normal text-neutral-200">
          Packets{" "}
          <span className="text-sm text-neutral-400">
            ({packets.length} total)
          </span>
        </h2>

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
            className="flex items-center px-3 py-1.5 text-sm bg-neutral-700 hover:bg-neutral-600 rounded transition-colors text-neutral-200"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Clear
          </button>
        </div>
      </div>

      <ul className="space-y-3">
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
            onClick={() => setCurrentPage(currentPage > 1 ? currentPage - 1 : 1)}
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