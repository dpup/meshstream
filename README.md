# Meshstream

A Go application that monitors the Meshtastic MQTT server and logs packets to the terminal.

## Setup

1. Clone this repository
2. Install dependencies:

```
go mod tidy
```

## Running

### Using Go directly

```
go run main.go
```

### Using Make

```
make run
```

### Using Docker

The application can be built and run in Docker using the provided Dockerfile:

```
# Build the Docker image
make docker-build

# Run the Docker container
make docker-run
```

Or using Docker Compose:

```
docker-compose up
```

#### Docker Environment Variables and Secrets

The application supports two types of environment variables:

1. **Build-time variables** - Used during the web application build (via Docker build args)
2. **Runtime variables** - Used when the application is running

You can set these variables in two ways:

1. **Using a `.env` file** (recommended for development and secrets):

   ```
   # Copy the sample file
   cp .env.example .env
   
   # Edit with your values, especially for secrets like Google Maps API key
   nano .env
   
   # Build and run with variables from .env
   docker-compose up --build
   ```

2. **Passing variables directly** (useful for CI/CD or one-off runs):

   ```
   # Example with custom settings
   docker run -p 8080:8080 \
     -e MESHSTREAM_MQTT_BROKER=your-mqtt-broker.com \
     -e MESHSTREAM_MQTT_TOPIC_PREFIX=msh/YOUR/REGION \
     -e MESHSTREAM_SERVER_HOST=0.0.0.0 \
     -e MESHSTREAM_STATIC_DIR=/app/static \
     meshstream
   ```

For build-time variables (like the Google Maps API key), use Docker build arguments with the MESHSTREAM_ prefix:

```
docker build \
  --build-arg MESHSTREAM_GOOGLE_MAPS_API_KEY=your_api_key_here \
  --build-arg MESHSTREAM_GOOGLE_MAPS_ID=your_maps_id_here \
  -t meshstream .
```

**Important Notes:**
- All environment variables use the `MESHSTREAM_` prefix. 
- The Dockerfile internally transforms build-time variables like `MESHSTREAM_GOOGLE_MAPS_API_KEY` to `VITE_GOOGLE_MAPS_API_KEY` for the web application build process.
- Web application configuration (site title, Google Maps API key, etc.) must be set at build time. These values are compiled into the static files and cannot be changed at runtime.
- To update web application configuration, you must rebuild the Docker image.

## Decoding Meshtastic Packets

This project includes the Meshtastic protocol buffer definitions in the `proto/` directory and a decoder for parsing MQTT packets. The application will automatically decode JSON messages and extract key information from binary messages.

### Protocol Buffer Compilation

To regenerate the protocol buffer Go code:

```
make gen-proto
```

This will:
1. Install the required protoc-gen-go compiler plugin in a local bin/ directory
2. Generate Go code from the protocol buffer definitions
3. Place the generated code in the proto/generated/ directory

### Packet Decoding

The application currently decodes packets in these formats:

1. JSON messages (from topics containing '/json/')
   - Extracts common fields like sender, receiver, and payload
   - Pretty-prints the JSON content

2. Binary messages (from topics containing '/binary/')
   - Shows basic topic information and a hex dump of the binary data

3. Text messages (from topics containing '/text/')
   - Displays the plain text content

The decoder is implemented in the `decoder` package.

## MQTT Configuration

- Broker: mqtt.bayme.sh
- Username: meshdev
- Password: large4cats
- Topic prefix: msh/US/CA/Motherlode