import { useEffect } from "react";
import { useAppDispatch } from "../hooks";
import { PacketList, PageWrapper } from "../components";
import { addPacket } from "../store/slices/packetSlice";
import { streamPackets, StreamEvent } from "../lib/api";

export function PacketsRoute() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Set up Server-Sent Events connection using our API utility
    const cleanup = streamPackets(
      // Event handler for all event types
      (event: StreamEvent) => {
        if (event.type === "message") {
          // Handle message events (actual packet data)
          dispatch(addPacket(event.data));
        }
      }
    );

    // Clean up connection when component unmounts
    return cleanup;
  }, [dispatch]);

  return (
    <PageWrapper>
      <PacketList />
    </PageWrapper>
  );
}
