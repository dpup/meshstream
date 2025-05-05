import React, { useState, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "../hooks";
import { PacketRenderer } from "./packets/PacketRenderer";
import { StreamControl } from "./StreamControl";
import {
  Trash2,
  RefreshCw,
  Archive,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { clearPackets, toggleStreamPause } from "../store/slices/packetSlice";
import { Packet } from "../lib/types";
import { Separator } from "./Separator";
import { Button } from "./ui/Button";

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

  // Get the earliest reception time from the packets with date context
  const getEarliestTime = useCallback((): string => {
    if (packets.length === 0) return "";

    // Find the packet with the earliest rxTime or time
    let earliestTime: number | undefined;

    packets.forEach((packet) => {
      // Check for rxTime first, then fall back to other timestamp fields
      const packetTime =
        packet.data.rxTime || packet.data.telemetry?.time || undefined;

      if (packetTime && (!earliestTime || packetTime < earliestTime)) {
        earliestTime = packetTime;
      }
    });

    if (!earliestTime) {
      return "unknown time";
    }

    // Create date objects for comparison
    const packetDate = new Date(earliestTime * 1000);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    // Format the time component
    const timeStr = packetDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    
    // Check if the packet is from today
    if (
      packetDate.getDate() === today.getDate() &&
      packetDate.getMonth() === today.getMonth() &&
      packetDate.getFullYear() === today.getFullYear()
    ) {
      return timeStr; // Just show the time for today
    }
    
    // Check if the packet is from yesterday
    if (
      packetDate.getDate() === yesterday.getDate() &&
      packetDate.getMonth() === yesterday.getMonth() &&
      packetDate.getFullYear() === yesterday.getFullYear()
    ) {
      return `${timeStr} yesterday`;
    }
    
    // If it's earlier than yesterday, show the day name
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Within the last week, show day name
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 6); // 6 days ago plus today = 7 days total
    
    if (packetDate >= lastWeek) {
      const dayName = daysOfWeek[packetDate.getDay()];
      return `${timeStr} ${dayName}`;
    }
    
    // For older dates, show the full date
    return packetDate.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: packetDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }, [packets]);

  // We don't need to track packet keys in state anymore since we use data.id
  // and it's deterministic - removing this effect to prevent the infinite loop issue

  // Calculate pagination regardless of state
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
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10">
        <div className="flex justify-between items-center mb-2">
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
            <Button onClick={handleClearPackets} icon={Trash2} size="md">
              Clear
            </Button>
          </div>
          <div className="text-sm text-neutral-400 px-2">
            {packets.length} packets received
            {packets.length > 0 && <>, since {getEarliestTime()}</>}
          </div>
        </div>
        <Separator className="mx-0" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 flex items-center justify-center h-40 text-neutral-300">
            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            Loading...
          </div>
        )}

        {error && (
          <div className="p-4 text-red-400 border border-red-800 rounded bg-neutral-900">
            Error: {error}
          </div>
        )}

        {!loading &&
          !error &&
          packets.length === 0 &&
          bufferedPackets.length === 0 && (
            <div className="p-6 max-w-4xl effect-inset rounded-lg border border-neutral-950/60 hover:bg-neutral-800">
              Waiting for packets
            </div>
          )}

        {!loading && !error && packets.length > 0 && (
          <ul className="space-y-12">
            {currentPackets.map((packet, index) => (
              <li key={getPacketKey(packet, index)}>
                <PacketRenderer packet={packet} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-auto">
        {/* Empty state when no packets are visible but stream is paused */}
        {packets.length === 0 && streamPaused && bufferedPackets.length > 0 && (
          <div className="p-4 text-amber-400 text-center border border-amber-900/60 bg-neutral-800/50 rounded-lg effect-inset mb-4">
            <div className="flex items-center justify-center mb-2">
              <Archive className="w-4 h-4 mr-2" />
              <span>
                Stream is paused with {bufferedPackets.length} buffered
                messages.
              </span>
            </div>
            <Button
              onClick={handleToggleStream}
              variant="primary"
              size="md"
              className="mt-2"
            >
              Resume to view
            </Button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <>
            <Separator className="mx-0 mt-4" />
            <div className="flex justify-between items-center text-sm py-2 bg-neutral-800/50 sticky bottom-0">
              <div className="text-sm text-neutral-400 px-2">
                Page {currentPage} of {totalPages}
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={() =>
                    setCurrentPage(currentPage > 1 ? currentPage - 1 : 1)
                  }
                  disabled={currentPage === 1}
                  icon={ChevronLeft}
                  variant="secondary"
                  size="md"
                >
                  Previous
                </Button>

                <Button
                  onClick={() =>
                    setCurrentPage(
                      currentPage < totalPages ? currentPage + 1 : totalPages
                    )
                  }
                  disabled={currentPage === totalPages}
                  icon={ChevronRight}
                  variant="secondary"
                  size="md"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
