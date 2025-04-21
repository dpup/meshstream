package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/dpup/prefab"

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
}

// New creates a new server instance
func New(config Config) *Server {
	if config.Broker == nil {
		log.Println("Warning: Server created without a broker, streaming will not work")
	}
	
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
		prefab.WithHTTPHandlerFunc("/api/stream", s.handleStream),
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

// handleStream handles Server-Sent Events streaming of MQTT messages
func (s *Server) handleStream(w http.ResponseWriter, r *http.Request) {
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
	notify := r.Context().Done()
	
	// Send an initial message
	fmt.Fprintf(w, "event: info\ndata: Connected to Meshtastic stream\n\n")
	flusher.Flush()

	// Stream messages to the client
	for {
		select {
		case <-notify:
			// Client disconnected, unsubscribe and return
			log.Println("Client disconnected, unsubscribing from broker")
			s.config.Broker.Unsubscribe(packetChan)
			return
			
		case packet, ok := <-packetChan:
			if !ok {
				// Channel closed, probably shutting down
				log.Println("Packet channel closed, ending stream")
				return
			}
			
			if packet == nil {
				continue
			}
			
			// Create a simplified packet for the frontend
			packetData := map[string]interface{}{
				"from":        packet.From,
				"to":          packet.To,
				"port":        packet.PortNum.String(),
				"timestamp":   time.Now().Unix(),
				"hop_limit":   packet.HopLimit,
				"hop_start":   packet.HopStart,
				"id":          packet.ID,
				"channel_id":  packet.ChannelID,
			}
			
			// Add payload information if available
			switch v := packet.Payload.(type) {
			case string:
				packetData["payload_type"] = "text"
				packetData["payload"] = v
			case []byte:
				packetData["payload_type"] = "binary"
				packetData["payload_size"] = len(v)
			case nil:
				packetData["payload_type"] = "none"
			default:
				packetData["payload_type"] = fmt.Sprintf("%T", v)
			}
			
			// Convert the packet to JSON
			data, err := json.Marshal(packetData)
			
			if err != nil {
				log.Printf("Error marshaling packet to JSON: %v", err)
				continue
			}
			
			// Send the event
			fmt.Fprintf(w, "event: message\ndata: %s\n\n", data)
			flusher.Flush()
		}
	}
}