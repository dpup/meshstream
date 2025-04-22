import React from 'react';

interface PacketDetailsProps {
  packet: any; // Will be properly typed once we have the protobuf structures
}

export const PacketDetails: React.FC<PacketDetailsProps> = ({ packet }) => {
  return (
    <div className="p-4 border rounded bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Packet Details</h3>
      <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
        {JSON.stringify(packet, null, 2)}
      </pre>
    </div>
  );
};
