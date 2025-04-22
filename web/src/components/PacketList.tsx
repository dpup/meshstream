import React from 'react';
import { useAppSelector } from '../hooks';

export const PacketList: React.FC = () => {
  const { packets, loading, error } = useAppSelector(state => state.packets);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (packets.length === 0) {
    return <div className="p-4">No packets received yet</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Received Packets</h2>
      <ul className="space-y-2">
        {packets.map(packet => (
          <li key={packet.id} className="p-2 border rounded">
            {packet.id}
          </li>
        ))}
      </ul>
    </div>
  );
};
