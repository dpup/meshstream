# Multi-stage build for Meshstream

###############################################################################
# Stage 1: Build the web application
###############################################################################
FROM node:20-alpine AS web-builder

WORKDIR /app/web

# Install pnpm globally
RUN npm install -g pnpm@latest

# Copy web app package files
COPY web/package.json web/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the web app source
COPY web/ ./

# Build-time environment variables for web app
ARG MESHSTREAM_API_BASE_URL=""
ARG MESHSTREAM_APP_ENV="production"
ARG MESHSTREAM_SITE_TITLE
ARG MESHSTREAM_SITE_DESCRIPTION
ARG MESHSTREAM_GOOGLE_MAPS_ID
ARG MESHSTREAM_GOOGLE_MAPS_API_KEY

# Convert MESHSTREAM_ prefixed args to VITE_ environment variables for the web build
ENV VITE_API_BASE_URL=${MESHSTREAM_API_BASE_URL} \
    VITE_APP_ENV=${MESHSTREAM_APP_ENV} \
    VITE_SITE_TITLE=${MESHSTREAM_SITE_TITLE} \
    VITE_SITE_DESCRIPTION=${MESHSTREAM_SITE_DESCRIPTION} \
    VITE_GOOGLE_MAPS_ID=${MESHSTREAM_GOOGLE_MAPS_ID} \
    VITE_GOOGLE_MAPS_API_KEY=${MESHSTREAM_GOOGLE_MAPS_API_KEY}

# Build the web app
RUN pnpm build

###############################################################################
# Stage 2: Build the Go server
###############################################################################
FROM golang:1.24-alpine AS go-builder

WORKDIR /app

# Install required system dependencies
RUN apk add --no-cache git protobuf make

# Cache Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy proto files (needed for any proto generation)
COPY proto/ ./proto/

# Copy web build from previous stage
COPY --from=web-builder /app/web/dist ./dist/static

# Copy the rest of the app code
COPY . .

# Generate protocol buffer code in case it's needed
RUN make gen-proto

# Build the Go application
RUN CGO_ENABLED=0 GOOS=linux go build -o /meshstream

###############################################################################
# Stage 3: Final lightweight runtime image
###############################################################################
FROM alpine:3.19

WORKDIR /app

# Add basic runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create a non-root user to run the app
RUN addgroup -S meshstream && adduser -S meshstream -G meshstream

# Copy the binary from the build stage
COPY --from=go-builder /meshstream /app/meshstream

# Copy the static files
COPY --from=go-builder /app/dist/static /app/static

# Set ownership to the non-root user
RUN chown -R meshstream:meshstream /app

# Switch to the non-root user
USER meshstream

# Expose the application port
EXPOSE 8080

# Server configuration
ENV MESHSTREAM_SERVER_HOST=0.0.0.0
ENV MESHSTREAM_SERVER_PORT=8080
ENV MESHSTREAM_STATIC_DIR=/app/static

# Reporting configuration
ENV MESHSTREAM_STATS_INTERVAL=30s 
ENV MESHSTREAM_CACHE_SIZE=1000 
ENV MESHSTREAM_VERBOSE_LOGGING=false

# MQTT configuration
ENV MESHSTREAM_MQTT_BROKER=mqtt.bayme.sh
ENV MESHSTREAM_MQTT_USERNAME=meshdev
ENV MESHSTREAM_MQTT_PASSWORD=large4cats
ENV MESHSTREAM_MQTT_TOPIC_PREFIX=msh/US/bayarea
ENV MESHSTREAM_MQTT_CLIENT_ID=meshstream
ENV MESHSTREAM_CHANNEL_KEYS=""

# MQTT connection tuning parameters
ENV MESHSTREAM_MQTT_KEEPALIVE=60
ENV MESHSTREAM_MQTT_CONNECT_TIMEOUT=30s
ENV MESHSTREAM_MQTT_PING_TIMEOUT=10s
ENV MESHSTREAM_MQTT_MAX_RECONNECT=5m
ENV MESHSTREAM_MQTT_USE_TLS=false
ENV MESHSTREAM_MQTT_TLS_PORT=8883

# Note: Web app configuration is set at build time
# and baked into the static files

# Run the application
ENTRYPOINT ["/app/meshstream"]