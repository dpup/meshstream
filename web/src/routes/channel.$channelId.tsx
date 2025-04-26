import { useEffect } from "react";
import { useAppSelector } from "../hooks";
import { PageWrapper, MessageBubble } from "../components";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/channel/$channelId")({
  component: ChannelPage,
});

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

function ChannelPage() {
  const { channelId } = Route.useParams();
  const navigate = useNavigate();

  const { channels, messages, nodes } = useAppSelector(
    (state) => state.aggregator
  );
  const channel = channels[channelId];
  // Create the channel key in the same format used by the aggregator
  const channelKey = `channel_${channelId}`;

  // Get channel messages and sort by timestamp (oldest to newest)
  // This creates a shallow copy of the message array to sort it without modifying the original
  const channelMessages = messages[channelKey]
    ? [...messages[channelKey]].sort((a, b) => a.timestamp - b.timestamp)
    : [];

  useEffect(() => {
    if (!channel) {
      console.log(`[Channel] Channel ${channelId} not found`);
      // Navigate back to channels page if this channel doesn't exist
      setTimeout(() => navigate({ to: "/channels" }), 500);
    } else {
      console.log(
        `[Channel] Displaying ${channelMessages.length} messages for channel ${channelId}`
      );
      console.log(
        `[Channel] Message count from channel data: ${channel.messageCount}`
      );
      console.log(`[Channel] Available messages:`, messages);
      console.log(`[Channel] Looking for key:`, channelKey);
    }
  }, [
    channel,
    channelId,
    channelKey,
    channelMessages.length,
    navigate,
    messages,
  ]);

  if (!channel) {
    return (
      <PageWrapper>
        <div className="text-center py-10">
          <p className="text-neutral-400">Channel not found. Redirecting...</p>
        </div>
      </PageWrapper>
    );
  }

  // Get the channel color based on its ID
  const channelColor = getChannelColor(channelId);

  return (
    <PageWrapper>
      <div className="max-w-4xl h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center mb-4">
          <Link
            to="/channels"
            className="mr-3 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full ${channelColor} flex items-center justify-center text-white text-sm font-bold`}
            >
              {channelId.substring(0, 2).toUpperCase()}
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-semibold text-neutral-100">
                {channelId}
              </h1>
              <p className="text-sm text-neutral-400">
                {channel.nodes.length} nodes · {channel.textMessageCount}{" "}
                messages
              </p>
            </div>
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto pb-4">
          {channelMessages.length === 0 ? (
            <div className="bg-neutral-800 rounded-lg p-6 text-center text-neutral-400">
              <p>No messages in this channel yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
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
    </PageWrapper>
  );
}
