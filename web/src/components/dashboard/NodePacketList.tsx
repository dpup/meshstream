import React, { useCallback } from "react";
import { useAppSelector } from "../../hooks";
import { PacketRenderer } from "../packets/PacketRenderer";
import { Packet } from "../../lib/types";
import { Separator } from "../Separator";

interface NodePacketListProps {
  /** Node ID to filter packets by */
  nodeId: number;
}

/**
 * Component to render packets associated with a specific node
 */
export const NodePacketList: React.FC<NodePacketListProps> = ({ nodeId }) => {
  const { packets } = useAppSelector((state) => state.packets);
  // Fixed number of packets to display
  const MAX_PACKETS = 20;

  // Get packets from this node (sent or received)
  const nodePackets = packets
    .filter(
      (packet) => packet.data.from === nodeId || packet.data.to === nodeId
    )
    .slice(0, MAX_PACKETS); // Show fixed number of packets

  // Generate a reproducible packet key
  const getPacketKey = useCallback((packet: Packet, index: number): string => {
    if (packet.data.id !== undefined && packet.data.from !== undefined) {
      const fromId = `!${packet.data.from.toString(16).toLowerCase()}`;
      return `${fromId}_${packet.data.id}`;
    }
    return `fallback_${index}`;
  }, []);

  if (nodePackets.length === 0) {
    return (
      <div className="p-6 effect-inset rounded-lg border border-neutral-950/60 bg-neutral-800/50 text-neutral-400 text-center">
        No packets found for this node
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <ul className="space-y-8 w-full">
        {nodePackets.map((packet, index) => (
          <li key={getPacketKey(packet, index)}>
            <PacketRenderer packet={packet} />
          </li>
        ))}
      </ul>
    </div>
  );
};
