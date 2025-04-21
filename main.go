package main

import (
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/dpup/prefab/logging"

	"meshstream/decoder"
	"meshstream/mqtt"
	"meshstream/server"
)

const (
	mqttBroker      = "mqtt.bayme.sh"
	mqttUsername    = "meshdev"
	mqttPassword    = "large4cats"
	mqttTopicPrefix = "msh/US/bayarea"
	logsDir         = "./logs"
	
	// Web server configuration
	serverHost      = "localhost"
	serverPort      = "8080"
)

func main() {
	// Set up logging
	logger := logging.NewDevLogger().Named("main")
	
	// Initialize default channel key
	err := decoder.AddChannelKey("LongFast", decoder.DefaultPrivateKey)
	if err != nil {
		logger.Errorw("Failed to initialize default channel key", "error", err)
	}

	if err := decoder.AddChannelKey("ERSN", "VIuMtC5uDDJtC/ojdH314HLkDIHanX4LdbK5yViV9jA="); err != nil {
		logger.Errorw("Failed to initialize ERSN channel key", "error", err)
	}

	// Configure and create the MQTT client
	mqttConfig := mqtt.Config{
		Broker:   mqttBroker,
		Username: mqttUsername,
		Password: mqttPassword,
		ClientID: "meshstream-client",
		Topic:    mqttTopicPrefix + "/#",
	}
	
	mqttClient := mqtt.NewClient(mqttConfig, logger)
	
	// Connect to the MQTT broker
	if err := mqttClient.Connect(); err != nil {
		logger.Fatalw("Failed to connect to MQTT broker", "error", err)
	}
	
	// Get the messages channel to receive decoded messages
	messagesChan := mqttClient.Messages()
	
	// Create a message broker to distribute messages to multiple consumers
	broker := mqtt.NewBroker(messagesChan, logger)
	
	// Create a stats tracker that subscribes to the broker
	// with statistics printed every 30 seconds
	stats := mqtt.NewMessageStats(broker, 30*time.Second, logger)
	
	// Create a message logger that subscribes to the broker
	// and also logs to stdout with a separator
	messageLogger, err := mqtt.NewMessageLogger(
		broker, 
		true, // Use brief mode for more concise logs
		true, // Enable logging to stdout
		strings.Repeat("-", 80), // Use separator
		logger,
	)
	if err != nil {
		logger.Warnw("Failed to initialize message logger", "error", err)
	}
	
	// Start the web server
	webServer := server.New(server.Config{
		Host:   serverHost,
		Port:   serverPort,
		Broker: broker,
	}, logger)
	
	// Start the server in a goroutine
	go func() {
		if err := webServer.Start(); err != nil {
			logger.Errorw("Web server error", "error", err)
		}
	}()
	
	// Setup signal handling for graceful shutdown
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	
	// Process messages until interrupt received
	fmt.Println("Waiting for messages... Press Ctrl+C to exit")
	fmt.Println("Statistics will be printed every 30 seconds")
	fmt.Println("Messages will be logged to files in the ./logs directory")
	fmt.Printf("Web server running at http://%s:%s\n", serverHost, serverPort)
	
	// Wait for interrupt signal
	<-sig
	
	// Got an interrupt signal, shutting down
	fmt.Println("Shutting down...")
	
	// Close components in reverse order of creation
	// First stop the web server
	if err := webServer.Stop(); err != nil {
		logger.Errorw("Error stopping web server", "error", err)
	}
	
	// Then stop the logger
	if messageLogger != nil {
		messageLogger.Close()
	}
	
	// Stop the stats collector
	stats.Close()
	
	// Close the broker (which will close all subscriber channels)
	broker.Close()
	
	// Then disconnect the MQTT client
	mqttClient.Disconnect()
}