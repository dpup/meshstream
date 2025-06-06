import React from "react";
import { TextMessage } from "../../store/slices/aggregatorSlice";
import { Link } from "@tanstack/react-router";

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
    // Use the full shortname if it's 4 characters or less
    if (nodeName.length <= 4) return nodeName.toUpperCase();
    
    // Try to get initials from words
    const words = nodeName.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    
    // Use up to 4 characters for the initials
    return nodeName.substring(0, 4).toUpperCase();
  }
  
  // Use last 4 chars of hex ID
  return nodeId.toString(16).slice(-4).toUpperCase();
};

// Get the preferred display name for a node
const getDisplayName = (nodeId: number, nodeName?: string) => {
  if (!nodeName) {
    return `!${nodeId.toString(16).toLowerCase()}`; // Use !hex format
  }
  
  // Prefer longName if available
  return nodeName;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, nodeName }) => {
  const initials = getNodeInitials(message.from, nodeName);
  const nodeColor = getNodeColor(message.from);
  const displayName = getDisplayName(message.from, nodeName);
  
  return (
    <div>
      {/* Header row with name and timestamp aligned right */}
      <div className="flex justify-end items-baseline mb-1 px-2 space-x-2">
        <span className="text-neutral-200 font-medium font-mono text-xs">
          {displayName}
        </span>
        <span className="text-[10px] text-neutral-500">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
      
      {/* Message row with avatar and text */}
      <div className="flex items-start">
        <Link
          to="/node/$nodeId"
          params={{ nodeId: message.from.toString(16).toLowerCase() }}
          className="flex-shrink-0"
        >
          <div className={`w-10 h-10 rounded-full ${nodeColor} flex items-center justify-center text-white text-[10px] font-bold hover:brightness-110 transition-all`}>
            {initials}
          </div>
        </Link>
        <div className="ml-3 flex-1">
          <div className="bg-neutral-800 rounded-lg py-2 px-3 text-neutral-300 break-words font-mono effect-inset text-sm whitespace-pre-wrap">
            {message.text}
          </div>
        </div>
      </div>
    </div>
  );
};