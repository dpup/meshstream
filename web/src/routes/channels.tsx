import { useEffect } from "react";
import { useAppSelector } from "../hooks";
import { PageWrapper, ChannelCard } from "../components";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/channels')({
  component: ChannelsPage,
});

function ChannelsPage() {
  const { channels, messages } = useAppSelector(state => state.aggregator);

  useEffect(() => {
    console.log(`[Channels] Displaying ${Object.keys(channels).length} channels`);
    console.log(`[Channels] Messages in store:`, messages);
    
    // Check if any channels have text messages but none are displayed
    Object.entries(channels).forEach(([channelId, channel]) => {
      const channelKey = `channel_${channelId}`;
      if (channel.textMessageCount > 0 && (!messages[channelKey] || messages[channelKey].length === 0)) {
        console.log(`[Channels] Mismatch: Channel ${channelId} reports ${channel.textMessageCount} text messages but has ${messages[channelKey]?.length || 0} in store`);
      }
    });
  }, [channels, messages]);

  // Extract and sort channels by last message time (most recent first)
  const sortedChannels = Object.values(channels).sort((a, b) => {
    // First sort by activity (last message time)
    if (a.lastMessage && b.lastMessage) {
      return b.lastMessage - a.lastMessage;
    }
    // If one has activity and other doesn't, prioritize the active one
    if (a.lastMessage) return -1;
    if (b.lastMessage) return 1;
    
    // Fall back to text message count if no last message time
    return (b.textMessageCount || 0) - (a.textMessageCount || 0);
  });

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-neutral-100 mb-6">Channels</h1>
        
        {sortedChannels.length === 0 ? (
          <div className="bg-neutral-800 rounded-lg p-6 text-center text-neutral-400">
            <p>No channels discovered yet.</p>
            <p className="text-sm mt-2">Channels will appear here as they are discovered on the Meshtastic network.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedChannels.map((channel) => (
              <ChannelCard key={channel.channelId} channel={channel} />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}