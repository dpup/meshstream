package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"github.com/dpup/prefab"
	"github.com/dpup/prefab/logging"
	"google.golang.org/protobuf/encoding/protojson"

	"meshstream/mqtt"
)

// Config holds server configuration
type Config struct {
	Host          string
	Port          string
	Logger        logging.Logger
	Broker        *mqtt.Broker // The MQTT message broker
	MQTTServer    string       // MQTT server hostname
	MQTTTopicPath string       // MQTT topic path being subscribed to
	StaticDir     string       // Directory containing static web files
	ChannelKeys   []string     // Channel keys for decryption
}

// Create connection info JSON to send to the client
type ConnectionInfo struct {
	Message    string `json:"message"`
	MQTTServer string `json:"mqttServer"`
	MQTTTopic  string `json:"mqttTopic"`
	Connected  bool   `json:"connected"`
	ServerTime int64  `json:"serverTime"`
}

// Server encapsulates the HTTP server functionality
type Server struct {
	config Config
	server *prefab.Server
	// Channel to signal shutdown to active connections
	shutdown chan struct{}
	// Atomic flag to indicate if server is shutting down
	isShuttingDown atomic.Bool
	// Logger instance
	logger logging.Logger
	// Atomic counter for active connections
	activeConnections atomic.Int64
}

// New creates a new server instance
func New(config Config) *Server {
	serverLogger := config.Logger.Named("server")

	if config.Broker == nil {
		serverLogger.Info("Warning: Server created without a broker, streaming will not work")
	}

	return &Server{
		config:   config,
		shutdown: make(chan struct{}),
		logger:   serverLogger,
	}
}

// Start initializes and starts the web server
func (s *Server) Start() error {
	// Get port as integer
	port, err := strconv.Atoi(s.config.Port)
	if err != nil {
		return err
	}

	baseCtx := context.Background()
	baseCtx = logging.With(baseCtx, s.logger)

	// Create a new prefab server
	s.server = prefab.New(
		prefab.WithContext(baseCtx),
		prefab.WithHost(s.config.Host),
		prefab.WithPort(port),
		prefab.WithHTTPHandlerFunc("/api/status", s.handleStatus),
		prefab.WithHTTPHandlerFunc("/api/stream", s.handleStream),
		prefab.WithStaticFiles("/assets", s.config.StaticDir+"/assets"),
		prefab.WithHTTPHandlerFunc("/", s.fallbackHandler),
	)

	// Start the server
	s.logger.Infof("Starting server on %s:%s", s.config.Host, s.config.Port)
	return s.server.Start()
}

// Stop shuts down the server
func (s *Server) Stop() error {
	// Set the shutdown flag first to prevent new connections from starting streams
	s.isShuttingDown.Store(true)

	// Signal all active connections to close
	close(s.shutdown)

	// Then shut down the HTTP server
	if s.server != nil {
		return s.server.Shutdown()
	}
	return nil
}

// handleStatus returns server status including active connections count and MQTT details
func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	logger := s.logger.Named("api.status")

	// Extract channel names without keys for security
	var channelNames []string
	for _, channelKeyPair := range s.config.ChannelKeys {
		parts := strings.SplitN(channelKeyPair, ":", 2)
		if len(parts) == 2 {
			channelNames = append(channelNames, parts[0])
		}
	}

	status := map[string]interface{}{
		"status":            "ok",
		"message":           "Meshtastic Stream API is running",
		"activeConnections": s.activeConnections.Load(),
		"mqttServer":        s.config.MQTTServer,
		"mqttTopic":         s.config.MQTTTopicPath,
		"channels":          channelNames,
	}

	logger.Debug("Status endpoint called")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

func (s *Server) fallbackHandler(w http.ResponseWriter, r *http.Request) {
	logger := s.logger.Named("api.fallback")
	logger.Info("Fallback handler called")

	// Serve the index.html file from the static directory
	http.ServeFile(w, r, s.config.StaticDir+"/index.html")
}

// handleStream handles Server-Sent Events streaming of MQTT messages
func (s *Server) handleStream(w http.ResponseWriter, r *http.Request) {
	logger := s.logger.Named("api.sse").With("remoteAddr", r.RemoteAddr)
	ctx := r.Context()

	// Increment active connections counter
	currentConnections := s.activeConnections.Add(1)
	logger.Infow("SSE stream requested", "activeConnections", currentConnections)

	// Ensure we decrement the counter when this function returns
	defer func() {
		remaining := s.activeConnections.Add(-1)
		logger.Infow("SSE stream closed", "activeConnections", remaining)
	}()

	// Check if the server is shutting down
	if s.isShuttingDown.Load() {
		http.Error(w, "Server is shutting down", http.StatusServiceUnavailable)
		return
	}

	// Check if broker is available
	if s.config.Broker == nil {
		http.Error(w, "MQTT broker not available", http.StatusServiceUnavailable)
		return
	}

	// Set headers for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Make sure that the writer supports flushing
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Subscribe to the broker with a buffer size of 100
	packetChan := s.config.Broker.Subscribe(100)

	// Signal when the client disconnects
	notify := ctx.Done()

	// Set up a ticker for heartbeat messages every 30 seconds
	heartbeatTicker := time.NewTicker(30 * time.Second)
	defer heartbeatTicker.Stop()

	// Send an initial message with connection information and an additional padding payload.
	// This forces buffer flush so the client knows the connection is open.
	w.WriteHeader(http.StatusOK)

	connectionInfo := ConnectionInfo{
		Message:    "Connected to stream",
		MQTTServer: s.config.MQTTServer,
		MQTTTopic:  s.config.MQTTTopicPath,
		Connected:  true,
		ServerTime: time.Now().Unix(),
	}

	// Convert to JSON
	infoJson, err := json.Marshal(connectionInfo)
	if err != nil {
		logger.Errorw("Failed to marshal connection info", "error", err)
		infoJson = []byte(`{"message":"Connected to stream"}`)
	}

	// Create padding for buffer flush
	paddingSize := 1500
	padding := make([]byte, paddingSize)
	for i := 0; i < paddingSize; i++ {
		padding[i] = byte('A' + (i % 26))
	}

	// Send the event with connection info and padded data
	fmt.Fprintf(w, "event: connection_info\ndata: %s\n\n", infoJson)
	fmt.Fprintf(w, "event: padding\ndata: %s\n\n", padding)
	flusher.Flush()

	// Stream messages to the client
	for {
		select {
		case <-notify:
			// Client disconnected, unsubscribe and return
			logger.Info("Client disconnected, unsubscribing from broker")
			s.config.Broker.Unsubscribe(packetChan)
			http.Error(w, "Client disconnected", http.StatusGone)
			return

		case <-s.shutdown:
			// Server is shutting down, send a message to client and close
			logger.Info("Server shutting down, closing SSE connection")
			fmt.Fprintf(w, "event: info\ndata: Server shutting down, connection closed\n\n")
			flusher.Flush()
			s.config.Broker.Unsubscribe(packetChan)
			http.Error(w, "Server is shutting down", http.StatusServiceUnavailable)
			return

		case <-heartbeatTicker.C:
			// Send a heartbeat message
			logger.Debug("Sending heartbeat")
			heartbeatMsg := fmt.Sprintf("Heartbeat: %s", time.Now().Format(time.RFC3339))
			fmt.Fprintf(w, "event: info\ndata: %s\n\n", heartbeatMsg)
			flusher.Flush()

		case packet, ok := <-packetChan:
			if !ok {
				// Channel closed, probably shutting down
				logger.Info("Packet channel closed, ending stream")
				http.Error(w, "Server is shutting down", http.StatusServiceUnavailable)
				return
			}

			if packet == nil {
				continue
			}

			// Use protojson Marshaler for the protobuf parts of the packet
			// Create a marshaler with pretty printing enabled
			marshaler := protojson.MarshalOptions{
				EmitUnpopulated: true,
				Multiline:       false,
				UseProtoNames:   false, // Use camelCase names
			}

			data, err := marshaler.Marshal(packet)
			if err != nil {
				logger.Errorw("Error marshaling packet to JSON", "error", err)
				http.Error(w, "Error marshaling packet", http.StatusInternalServerError)
				return
			}

			// Send the event
			fmt.Fprintf(w, "event: message\ndata: %s\n\n", data)
			flusher.Flush()
		}
	}
}
