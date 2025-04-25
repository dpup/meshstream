import React from "react";
import { Link } from "@tanstack/react-router";
import { ChannelData } from "../../store/slices/aggregatorSlice";

interface ChannelCardProps {
  channel: ChannelData;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({ channel }) => {
  // Generate a random color for the channel icon
  const getChannelColor = () => {
    const colors = [
      'bg-green-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
    ];
    
    // Use a hash of the channel ID to pick a consistent color
    const hash = channel.channelId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Get short identifier for channel
  const getChannelInitials = () => {
    // Use first 2 characters
    return channel.channelId.substring(0, 2).toUpperCase();
  };

  // Format last message time as relative time
  const formatLastMessageTime = () => {
    if (!channel.lastMessage) return '';
    
    const now = Math.floor(Date.now() / 1000);
    const diff = now - channel.lastMessage;
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };
  
  return (
    <Link 
      to="/channel/$channelId" 
      params={{ channelId: channel.channelId }}
      className="bg-neutral-800 rounded-lg p-4 hover:bg-neutral-700 transition-colors"
    >
      <div className="flex items-center mb-3">
        <div className={`w-10 h-10 rounded-full ${getChannelColor()} flex items-center justify-center text-white text-sm font-bold`}>
          {getChannelInitials()}
        </div>
        <div className="ml-3 flex-1 truncate">
          <h3 className="text-lg text-neutral-200 font-medium truncate">{channel.channelId}</h3>
          {channel.lastMessage && (
            <p className="text-xs text-neutral-400">{formatLastMessageTime()}</p>
          )}
        </div>
      </div>
      <div className="flex justify-between text-neutral-400 text-sm">
        <div>
          <span className="text-amber-500 font-medium">{channel.textMessageCount}</span> messages
        </div>
        <div>
          <span className="text-green-500 font-medium">{channel.nodes.length}</span> nodes
        </div>
        <div>
          <span className="text-blue-500 font-medium">{channel.gateways.length}</span> gateways
        </div>
      </div>
    </Link>
  );
};