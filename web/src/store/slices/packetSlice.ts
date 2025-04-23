import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Packet } from '../../lib/types';

// Maximum number of packets to keep in memory
const MAX_PACKETS = 100;

interface PacketState {
  packets: Packet[];
  loading: boolean;
  error: string | null;
  streamPaused: boolean;
  bufferedPackets: Packet[]; // Holds packets received while paused
}

const initialState: PacketState = {
  packets: [],
  loading: false,
  error: null,
  streamPaused: false,
  bufferedPackets: [],
};

const packetSlice = createSlice({
  name: 'packets',
  initialState,
  reducers: {
    fetchPacketsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchPacketsSuccess(state, action: PayloadAction<Packet[]>) {
      // Limit initial load to MAX_PACKETS
      state.packets = action.payload.slice(-MAX_PACKETS);
      state.loading = false;
    },
    fetchPacketsFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    addPacket(state, action: PayloadAction<Packet>) {
      if (state.streamPaused) {
        // When paused, add to buffer instead of main list
        state.bufferedPackets.unshift(action.payload);
        
        // Ensure buffer doesn't grow too large
        if (state.bufferedPackets.length > MAX_PACKETS) {
          state.bufferedPackets = state.bufferedPackets.slice(0, MAX_PACKETS);
        }
      } else {
        // Normal flow - add to main list
        state.packets.unshift(action.payload);
        
        // Remove oldest packets if we exceed the limit
        if (state.packets.length > MAX_PACKETS) {
          state.packets = state.packets.slice(0, MAX_PACKETS);
        }
      }
    },
    clearPackets(state) {
      state.packets = [];
      state.bufferedPackets = [];
    },
    toggleStreamPause(state) {
      state.streamPaused = !state.streamPaused;
      
      // If unpausing, prepend buffered packets to the main list
      if (!state.streamPaused && state.bufferedPackets.length > 0) {
        state.packets = [...state.bufferedPackets, ...state.packets]
          .slice(0, MAX_PACKETS);
        state.bufferedPackets = [];
      }
    },
    // Explicitly set the pause state
    setPauseState(state, action: PayloadAction<boolean>) {
      const newPausedState = action.payload;
      
      // Only process if state is actually changing
      if (state.streamPaused !== newPausedState) {
        state.streamPaused = newPausedState;
        
        // If unpausing, prepend buffered packets to the main list
        if (!newPausedState && state.bufferedPackets.length > 0) {
          state.packets = [...state.bufferedPackets, ...state.packets]
            .slice(0, MAX_PACKETS);
          state.bufferedPackets = [];
        }
      }
    }
  },
});

export const { 
  fetchPacketsStart,
  fetchPacketsSuccess,
  fetchPacketsFailure,
  addPacket,
  clearPackets,
  toggleStreamPause,
  setPauseState,
} = packetSlice.actions;

export default packetSlice.reducer;