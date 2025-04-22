import { useEffect, useState } from 'react';
import { useAppDispatch } from '../hooks';
import { PacketList } from '../components/PacketList';
import { InfoMessage } from '../components/InfoMessage';
import { addPacket } from '../store/slices/packetSlice';
import { streamPackets, StreamEvent } from '../lib/api';

export function PacketsRoute() {
  const dispatch = useAppDispatch();
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');

  useEffect(() => {
    // Set up Server-Sent Events connection using our API utility
    const cleanup = streamPackets(
      // Event handler for all event types
      (event: StreamEvent) => {
        if (event.type === 'info') {
          // Handle info events (connection status, etc.)
          setConnectionStatus(event.data);
        } else if (event.type === 'message') {
          // Handle message events (actual packet data)
          dispatch(addPacket(event.data));
        }
      },
      // On error
      () => {
        setConnectionStatus('Connection error. Reconnecting...');
        console.error('EventSource failed, reconnecting...');
      }
    );
    
    // Clean up connection when component unmounts
    return cleanup;
  }, [dispatch]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Mesh Network Packets</h2>
      
      {/* Connection status indicator */}
      <InfoMessage 
        message={`Status: ${connectionStatus}`} 
        type={connectionStatus.includes('error') ? 'error' : 'info'} 
      />
      
      <p className="mb-4">
        This page displays real-time packets from the Meshtastic mesh network.
      </p>
      
      <PacketList />
    </div>
  );
}
