import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Interface for MQTT connection information
export interface ConnectionInfo {
  mqttServer: string;
  mqttTopic: string;
  connected: boolean;
  serverTime?: number;
  message?: string;
}

// State for the connection slice
interface ConnectionState {
  info: ConnectionInfo | null;
}

// Initial state
const initialState: ConnectionState = {
  info: null,
};

// Create the connection slice
const connectionSlice = createSlice({
  name: "connection",
  initialState,
  reducers: {
    // Update connection information
    updateConnectionInfo(state, action: PayloadAction<ConnectionInfo>) {
      state.info = action.payload;
    },
    
    // Reset connection information
    resetConnectionInfo(state) {
      state.info = null;
    },
    
    // Update connection status only
    updateConnectionStatus(state, action: PayloadAction<boolean>) {
      if (state.info) {
        state.info.connected = action.payload;
      }
    },
  },
});

// Export actions
export const {
  updateConnectionInfo,
  resetConnectionInfo,
  updateConnectionStatus,
} = connectionSlice.actions;

// Export reducer
export default connectionSlice.reducer;