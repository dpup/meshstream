import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Packet {
  id: string;
  // We'll define the full packet structure later based on the protobuf definitions
}

interface PacketState {
  packets: Packet[];
  loading: boolean;
  error: string | null;
}

const initialState: PacketState = {
  packets: [],
  loading: false,
  error: null,
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
      state.packets = action.payload;
      state.loading = false;
    },
    fetchPacketsFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    addPacket(state, action: PayloadAction<Packet>) {
      state.packets.push(action.payload);
    },
  },
});

export const { 
  fetchPacketsStart,
  fetchPacketsSuccess,
  fetchPacketsFailure,
  addPacket,
} = packetSlice.actions;

export default packetSlice.reducer;
