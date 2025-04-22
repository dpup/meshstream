import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PacketList } from './PacketList';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import packetReducer from '../store/slices/packetSlice';

describe('PacketList', () => {
  it('renders the empty state correctly', () => {
    const store = configureStore({
      reducer: {
        packets: packetReducer,
      },
    });

    render(
      <Provider store={store}>
        <PacketList />
      </Provider>
    );

    expect(screen.getByText('No packets received yet')).toBeInTheDocument();
  });
});
