import React from 'react';

interface MessageDisplayProps {
  message: any; // Will be properly typed once we have the protobuf structures
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({ message }) => {
  // The data structure will be refined as we integrate with the protobuf definitions
  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <div className="flex justify-between mb-2">
        <span className="font-medium">{message.from || 'Unknown'}</span>
        <span className="text-gray-500 text-sm">
          {message.timestamp ? new Date(message.timestamp).toLocaleString() : 'No timestamp'}
        </span>
      </div>
      <div className="mb-2">
        {message.text || 'No content'}
      </div>
      <div className="text-xs text-gray-500">
        ID: {message.id || 'No ID'}
      </div>
    </div>
  );
};
