package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"meshstream/decoder"
	"meshstream/mqtt"
)

const (
	mqttBroker      = "mqtt.bayme.sh"
	mqttUsername    = "meshdev"
	mqttPassword    = "large4cats"
	mqttTopicPrefix = "msh/US/bayarea"
	logsDir         = "./logs"
)

func main() {
	// Set up logging
	log.SetOutput(os.Stdout)

	// Initialize default channel key
	err := decoder.AddChannelKey("LongFast", decoder.DefaultPrivateKey)
	if err != nil {
		log.Printf("Failed to initialize default channel key: %v", err)
	}

	if err := decoder.AddChannelKey("ERSN", "VIuMtC5uDDJtC/ojdH314HLkDIHanX4LdbK5yViV9jA="); err != nil {
		log.Printf("Failed to initialize ERSN channel key: %v", err)
	}

	// Configure and create the MQTT client
	mqttConfig := mqtt.Config{
		Broker:   mqttBroker,
		Username: mqttUsername,
		Password: mqttPassword,
		ClientID: "meshstream-client",
		Topic:    mqttTopicPrefix + "/#",
	}
	
	mqttClient := mqtt.NewClient(mqttConfig)
	
	// Connect to the MQTT broker
	if err := mqttClient.Connect(); err != nil {
		log.Fatalf("Failed to connect to MQTT broker: %v", err)
	}
	
	// Get the messages channel to receive decoded messages
	messagesChan := mqttClient.Messages()
	
	// Create a message broker to distribute messages to multiple consumers
	broker := mqtt.NewBroker(messagesChan)
	
	// Create a consumer channel for display with buffer size 10
	displayChan := broker.Subscribe(10)
	
	// Create a stats tracker that subscribes to the broker
	// with statistics printed every 30 seconds
	stats := mqtt.NewMessageStats(broker, 30*time.Second)
	
	// Create a message logger that subscribes to the broker
	messageLogger, err := mqtt.NewMessageLogger(broker, logsDir)
	if err != nil {
		log.Printf("Warning: Failed to initialize message logger: %v", err)
	}
	
	// Setup signal handling for graceful shutdown
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	
	// Process messages until interrupt received
	fmt.Println("Waiting for messages... Press Ctrl+C to exit")
	fmt.Println("Statistics will be printed every 30 seconds")
	fmt.Println("Specific message types will be logged to files in the ./logs directory")
	
	// Main event loop for display
	for {
		select {
		case packet := <-displayChan:
			if packet == nil {
				log.Println("Received nil packet, subscriber channel may be closed")
				continue
			}
			
			// Format and print the decoded message
			formattedOutput := decoder.FormatTopicAndPacket(packet.TopicInfo, packet.DecodedPacket)
			fmt.Println(formattedOutput)
			fmt.Println(strings.Repeat("-", 80))
			
		case <-sig:
			// Got an interrupt signal, shutting down
			fmt.Println("Shutting down...")
			
			// Close components in reverse order of creation
			if messageLogger != nil {
				messageLogger.Close()
			}
			
			stats.Close()
			
			// Close the broker (which will close all subscriber channels)
			broker.Close()
			
			// Then disconnect the MQTT client
			mqttClient.Disconnect()
			return
		}
	}
}