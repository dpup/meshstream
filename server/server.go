package server

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/dpup/prefab"
)

// Config holds server configuration
type Config struct {
	Host string
	Port string
}

// Server encapsulates the HTTP server functionality
type Server struct {
	config Config
	server *prefab.Server
}

// New creates a new server instance
func New(config Config) *Server {
	return &Server{
		config: config,
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
		prefab.WithStaticFiles("/", "./server/static"),
	)

	// Start the server
	log.Printf("Starting server on %s:%s", s.config.Host, s.config.Port)
	return s.server.Start()
}

// Stop shuts down the server
func (s *Server) Stop() error {
	if s.server != nil {
		return s.server.Shutdown()
	}
	return nil
}

// handleStatus is a placeholder API endpoint that returns server status
func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	status := map[string]interface{}{
		"status": "ok",
		"message": "Meshtastic Stream API is running",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}