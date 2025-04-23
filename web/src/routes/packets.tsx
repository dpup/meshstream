import { useEffect } from "react";
import { useAppDispatch } from "../hooks";
import { PacketList } from "../components/PacketList";
import { InfoMessage, Separator } from "../components";
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
    <div className="bg-neutral-700 rounded-lg shadow-inner">
      <div className="p-6">
        <PacketList />
      </div>
    </div>
  );
}
