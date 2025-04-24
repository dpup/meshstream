import { configureStore } from '@reduxjs/toolkit';
import packetReducer from './slices/packetSlice';
import aggregatorReducer from './slices/aggregatorSlice';

export const store = configureStore({
  reducer: {
    packets: packetReducer,
    aggregator: aggregatorReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
