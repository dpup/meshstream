import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock for window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock for ResizeObserver
window.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock for EventSource
class MockEventSource {
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  constructor(public url: string) {}
  
  close() {
    // Do nothing
  }
  
  addEventListener(event: string, callback: (event: any) => void) {
    if (event === 'message') {
      this.onmessage = callback;
    } else if (event === 'error') {
      this.onerror = callback;
    }
  }
  
  removeEventListener(event: string, callback: (event: any) => void) {
    if (event === 'message' && this.onmessage === callback) {
      this.onmessage = null;
    } else if (event === 'error' && this.onerror === callback) {
      this.onerror = null;
    }
  }
}

// Override EventSource globally
window.EventSource = MockEventSource as any;