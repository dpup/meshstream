# Meshstream Web Interface

This is the web interface for the Meshstream application, which provides a real-time view of Meshtastic network traffic.

## Technologies Used

- Vite
- React
- TypeScript
- Redux Toolkit
- Tailwind CSS
- Tanstack Router

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Structure

- `src/components/` - React components
- `src/routes/` - Tanstack Router route components
- `src/store/` - Redux store and slices
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and API clients
- `src/styles/` - CSS styles
- `src/assets/` - Static assets like images

## API

The application communicates with the Meshstream server via:

- REST API endpoints at `/api/...`
- Server-Sent Events (SSE) connection at `/api/stream`

See `src/lib/api.ts` for more details on the API client implementation.
