import { configureStore } from '@reduxjs/toolkit';
import packetReducer from './slices/packetSlice';

export const store = configureStore({
  reducer: {
    packets: packetReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
