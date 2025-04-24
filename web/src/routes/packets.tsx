import { useEffect } from "react";
import { useAppDispatch } from "../hooks";
import { PacketList, PageWrapper } from "../components";
import { addPacket } from "../store/slices/packetSlice";
import { streamPackets, StreamEvent } from "../lib/api";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/packets')({
  component: PacketsPage,
});

function PacketsPage() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Subscribe to packet events for this route specifically
    const cleanup = streamPackets(
      (event: StreamEvent) => {
        if (event.type === "message") {
          // Only handle for packet display in this route
          dispatch(addPacket(event.data));
        }
      }
    );

    return cleanup;
  }, [dispatch]);

  return (
    <PageWrapper>
      <PacketList />
    </PageWrapper>
  );
}
