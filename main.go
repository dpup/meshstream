package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"meshstream/decoder"
	"meshstream/mqtt"
)

const (
	mqttBroker      = "mqtt.bayme.sh"
	mqttUsername    = "meshdev"
	mqttPassword    = "large4cats"
	mqttTopicPrefix = "msh/US/bayarea"
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
	
	// Setup signal handling for graceful shutdown
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	
	// Process messages until interrupt received
	fmt.Println("Waiting for messages... Press Ctrl+C to exit")
	
	// Main event loop
	for {
		select {
		case packet := <-messagesChan:
			// Format and print the decoded message
			formattedOutput := decoder.FormatTopicAndPacket(packet.TopicInfo, packet.DecodedPacket)
			fmt.Println(formattedOutput)
			fmt.Println(strings.Repeat("-", 80))
			
		case <-sig:
			// Got an interrupt signal, shutting down
			fmt.Println("Shutting down...")
			mqttClient.Disconnect()
			return
		}
	}
}