import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppSelector } from "../../hooks";
import { Separator } from "../Separator";
import { MessageBubble } from "../messages";
import { ArrowLeft, MessageSquare, Users, Wifi } from "lucide-react";

interface ChannelDetailProps {
  channelId: string;
}

// Generate a deterministic color based on channel ID
const getChannelColor = (channelId: string) => {
  const colors = [
    "bg-green-500",
    "bg-blue-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-teal-500",
  ];

  // Use a hash of the channel ID to pick a consistent color
  const hash = channelId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const ChannelDetail: React.FC<ChannelDetailProps> = ({ channelId }) => {
  const navigate = useNavigate();
  const { channels, messages, nodes } = useAppSelector(
    (state) => state.aggregator
  );
  
  const channel = channels[channelId];
  // Create the channel key in the same format used by the aggregator
  const channelKey = `channel_${channelId}`;

  // Get channel messages and sort by timestamp (newest to oldest)
  // This creates a shallow copy of the message array to sort it without modifying the original
  const channelMessages = messages[channelKey]
    ? [...messages[channelKey]].sort((a, b) => b.timestamp - a.timestamp)
    : [];

  const handleBack = () => {
    navigate({ to: "/channels" });
  };

  if (!channel) {
    return (
      <div className="p-6 text-red-400 border border-red-900 rounded bg-neutral-900 effect-inset">
        <div className="flex items-center mb-3">
          <button
            onClick={handleBack}
            className="flex items-center mr-3 px-2 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 rounded transition-colors effect-inset"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
          <h1 className="text-xl font-semibold">Channel Not Found</h1>
        </div>
        <p>The channel {channelId} was not found or has not been seen yet.</p>
      </div>
    );
  }

  // Get the channel color based on its ID
  const channelColor = getChannelColor(channelId);

  // Determine if the channel is active (has messages in the last 10 minutes)
  const isActive = channelMessages.length > 0 && 
    (Math.floor(Date.now() / 1000) - channelMessages[0].timestamp) < 600;

  return (
    <div className="max-w-4xl h-full flex flex-col">
      {/* Header with back button and channel info */}
      <div className="flex items-center px-4 bg-neutral-800/50 rounded-lg">
        <button
          onClick={handleBack}
          className="flex items-center mr-4 p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 rounded-full transition-colors effect-outset"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div
          className={`p-2 mr-3 rounded-full ${channelColor} flex items-center justify-center effect-inset`}
        >
          <Wifi className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 flex flex-col md:flex-row md:items-center">
          <h1 className="text-xl font-semibold text-neutral-200 mr-3">
            {channelId}
          </h1>
          <div className="text-sm text-neutral-400 flex items-center">
            <span
              className={`inline-block w-2 h-2 rounded-full mr-2 ${isActive ? "bg-green-500" : "bg-neutral-500"}`}
            ></span>
            {isActive ? "Active" : "Inactive"}
          </div>
        </div>
        <div className="flex space-x-4 items-center">
          <div className="flex items-center text-neutral-300">
            <Users className="w-4 h-4 mr-1.5 text-blue-400" />
            <span className="text-sm">{channel.nodes.length}</span>
          </div>
          <div className="flex items-center text-neutral-300">
            <MessageSquare className="w-4 h-4 mr-1.5 text-green-400" />
            <span className="text-sm">{channel.textMessageCount}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Message List - Chat style without title */}
      <div className="flex-1 overflow-y-auto pb-4 mt-4">
        {channelMessages.length === 0 ? (
          <div className="bg-neutral-800/50 rounded-lg p-6 text-center text-neutral-400 effect-inset">
            <p>No messages in this channel yet.</p>
          </div>
        ) : (
          <div className="space-y-4 px-2">
            {channelMessages.map((message) => {
              const nodeName =
                nodes[message.from]?.shortName ||
                nodes[message.from]?.longName;

              return (
                <MessageBubble
                  key={`${message.from}-${message.id}`}
                  message={message}
                  nodeName={nodeName}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};