import { useEffect } from "react";
import { PageWrapper } from "../components";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChannelDetail } from "../components/dashboard";
import { useAppSelector } from "../hooks";

export const Route = createFileRoute("/channel/$channelId")({
  component: ChannelPage,
});

function ChannelPage() {
  const { channelId } = Route.useParams();
  const navigate = useNavigate();
  const { channels } = useAppSelector((state) => state.aggregator);

  // Navigation timeout if channel doesn't exist
  useEffect(() => {
    if (!channels[channelId]) {
      console.log(`[Channel] Channel ${channelId} not found, redirecting...`);
      const timeout = setTimeout(() => {
        navigate({ to: "/channels" });
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [channelId, navigate, channels]);

  return (
    <PageWrapper>
      <ChannelDetail channelId={channelId} />
    </PageWrapper>
  );
}
