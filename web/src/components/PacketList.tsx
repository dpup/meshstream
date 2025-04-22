import React from "react";
import { useAppSelector } from "../hooks";

export const PacketList: React.FC = () => {
  const { packets, loading, error } = useAppSelector((state) => state.packets);

  if (loading) {
    return <div className="p-4 text-neutral-300">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-400">Error: {error}</div>;
  }

  if (packets.length === 0) {
    return <div className="p-4 text-neutral-400">No packets received yet</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-neutral-200">
        Received Packets
      </h2>
      <ul className="space-y-2">
        {packets.map((packet) => (
          <li
            key={packet.id}
            className="p-3 border border-neutral-700 rounded bg-neutral-900 shadow-inner text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            {packet.id}
          </li>
        ))}
      </ul>
    </div>
  );
};
