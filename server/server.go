package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync/atomic"

	"github.com/dpup/prefab"
	"github.com/dpup/prefab/logging"
	"google.golang.org/protobuf/encoding/protojson"

	"meshstream/mqtt"
)

// Config holds server configuration
type Config struct {
	Host   string
	Port   string
	Logger logging.Logger
	Broker *mqtt.Broker // The MQTT message broker
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

	// Create a new prefab server
	s.server = prefab.New(
		prefab.WithHost(s.config.Host),
		prefab.WithPort(port),
		prefab.WithHTTPHandlerFunc("/api/status", s.handleStatus),
		prefab.WithHTTPHandlerFunc("/api/stream", s.handleStream),
		prefab.WithStaticFiles("/", "./server/static"),
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

// handleStatus is a placeholder API endpoint that returns server status
func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	logger := s.logger.Named("api.status")

	status := map[string]interface{}{
		"status":  "ok",
		"message": "Meshtastic Stream API is running",
	}

	logger.Debug("Status endpoint called")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// handleStream handles Server-Sent Events streaming of MQTT messages
func (s *Server) handleStream(w http.ResponseWriter, r *http.Request) {
	logger := s.logger.Named("api.sse").With("remoteAddr", r.RemoteAddr)
	ctx := r.Context()

	logger.Infow("SSE stream requested")

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

	// Subscribe to the broker with a buffer size of 10
	packetChan := s.config.Broker.Subscribe(10)

	// Signal when the client disconnects
	notify := ctx.Done()

	// Send an initial message with an additional 1.5k payload. This force buffer
	// flush so the client knows the connection is open.
	w.WriteHeader(http.StatusOK)

	initialMessage := "Connected to stream"
	paddingSize := 1500
	padding := make([]byte, paddingSize)
	for i := 0; i < paddingSize; i++ {
		padding[i] = byte('A' + (i % 26))
	}

	// Send the event with the padded data
	fmt.Fprintf(w, "event: info\ndata: %s\n\n", initialMessage)
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
