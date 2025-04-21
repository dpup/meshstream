package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/dpup/prefab"
	"github.com/dpup/prefab/logging"

	"meshstream/mqtt"
)

// Config holds server configuration
type Config struct {
	Host   string
	Port   string
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
func New(config Config, logger logging.Logger) *Server {
	// Use provided logger or create a default one
	if logger == nil {
		logger = logging.NewDevLogger()
	}
	serverLogger := logger.Named("server")
	
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
	ctx := r.Context()
	// Ensure logger is in context
	ctx = logging.EnsureLogger(ctx)
	logger := logging.FromContext(ctx).Named("api.status")
	
	status := map[string]interface{}{
		"status": "ok",
		"message": "Meshtastic Stream API is running",
	}
	
	logger.Debug("Status endpoint called")
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// handleStream handles Server-Sent Events streaming of MQTT messages
func (s *Server) handleStream(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// Ensure we have a logger in the context
	ctx = logging.EnsureLogger(ctx)
	// Create request-scoped logger 
	logger := logging.FromContext(ctx).Named("sse")
	
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
	
	// Send an initial message
	fmt.Fprintf(w, "event: info\ndata: Connected to Meshtastic stream\n\n")
	flusher.Flush()

	// Stream messages to the client
	for {
		select {
		case <-notify:
			// Client disconnected, unsubscribe and return
			logger.Info("Client disconnected, unsubscribing from broker")
			s.config.Broker.Unsubscribe(packetChan)
			return
			
		case <-s.shutdown:
			// Server is shutting down, send a message to client and close
			logger.Info("Server shutting down, closing SSE connection")
			fmt.Fprintf(w, "event: info\ndata: Server shutting down, connection closed\n\n")
			flusher.Flush()
			s.config.Broker.Unsubscribe(packetChan)
			return
			
		case packet, ok := <-packetChan:
			if !ok {
				// Channel closed, probably shutting down
				logger.Info("Packet channel closed, ending stream")
				return
			}
			
			if packet == nil {
				continue
			}
			
			// Create a serializable wrapper for the packet
			// That includes both the entire packet and some extra fields for convenience
			packetWrapper := struct {
				*mqtt.Packet
				ReceivedAt int64  `json:"received_at"`
				PortString string `json:"port_string"`
			}{
				Packet:     packet,
				ReceivedAt: time.Now().Unix(),
				PortString: packet.PortNum.String(),
			}
			
			// Convert the entire packet to JSON
			data, err := json.Marshal(packetWrapper)
			
			if err != nil {
				logger.Errorw("Error marshaling packet to JSON", "error", err)
				continue
			}
			
			// Send the event
			fmt.Fprintf(w, "event: message\ndata: %s\n\n", data)
			flusher.Flush()
		}
	}
}