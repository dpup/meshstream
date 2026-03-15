import { configureStore } from '@reduxjs/toolkit';
import packetReducer from './slices/packetSlice';
import aggregatorReducer from './slices/aggregatorSlice';
import connectionReducer from './slices/connectionSlice';
import topologyReducer from './slices/topologySlice';

export const store = configureStore({
  reducer: {
    packets: packetReducer,
    aggregator: aggregatorReducer,
    connection: connectionReducer,
    topology: topologyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
