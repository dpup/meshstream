import React from "react";
import { TextMessage } from "../../store/slices/aggregatorSlice";

interface MessageBubbleProps {
  message: TextMessage;
  nodeName?: string;
}

// Helper to format timestamp
const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Generate a deterministic color based on node ID
const getNodeColor = (nodeId: number) => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 
    'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-orange-500'
  ];
  return colors[nodeId % colors.length];
};

// Get node initials or ID fragment
const getNodeInitials = (nodeId: number, nodeName?: string) => {
  if (nodeName) {
    // Use first 2 characters or extract initials
    if (nodeName.length <= 2) return nodeName.toUpperCase();
    
    // Try to get initials from words
    const words = nodeName.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    
    return nodeName.substring(0, 2).toUpperCase();
  }
  
  // Use last 4 chars of hex ID
  return nodeId.toString(16).slice(-4).toUpperCase();
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, nodeName }) => {
  const initials = getNodeInitials(message.from, nodeName);
  const nodeColor = getNodeColor(message.from);
  
  return (
    <div className="flex">
      <div className={`flex-shrink-0 w-9 h-9 rounded-full ${nodeColor} flex items-center justify-center text-white text-xs font-bold`}>
        {initials}
      </div>
      <div className="ml-3 flex-1">
        <div className="flex items-baseline">
          <span className="text-neutral-200 font-medium">
            {nodeName || `Node ${message.from.toString(16)}`}
          </span>
          <span className="ml-2 text-xs text-neutral-500">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
        <div className="mt-1 bg-neutral-800 rounded-lg py-2 px-3 text-neutral-300 break-words">
          {message.text}
        </div>
      </div>
    </div>
  );
};