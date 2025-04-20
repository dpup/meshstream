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

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

const (
	mqttBroker      = "mqtt.bayme.sh"
	mqttUsername    = "meshdev"
	mqttPassword    = "large4cats"
	mqttTopicPrefix = "msh/US"
)

var messagePubHandler mqtt.MessageHandler = func(client mqtt.Client, msg mqtt.Message) {
	fmt.Printf("Received message from topic: %s\n", msg.Topic())

	// Parse the topic structure
	topicInfo, err := decoder.ParseTopic(msg.Topic())
	if err != nil {
		fmt.Printf("Error parsing topic: %v\n", err)
		fmt.Printf("Raw topic: %s\n", msg.Topic())
		fmt.Printf("Raw payload: %x\n", msg.Payload())
	} else {
		// Format and print the message
		formattedOutput := decoder.FormatMessage(topicInfo, msg.Payload())
		fmt.Println(formattedOutput)
	}

	fmt.Println(strings.Repeat("-", 80))
}

var connectHandler mqtt.OnConnectHandler = func(client mqtt.Client) {
	fmt.Println("Connected to MQTT Broker!")
}

var connectLostHandler mqtt.ConnectionLostHandler = func(client mqtt.Client, err error) {
	fmt.Printf("Connection lost: %v\n", err)
}

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

	// Create MQTT client options
	opts := mqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("tcp://%s:1883", mqttBroker))
	opts.SetClientID("meshstream-client")
	opts.SetUsername(mqttUsername)
	opts.SetPassword(mqttPassword)
	opts.SetDefaultPublishHandler(messagePubHandler)
	opts.SetPingTimeout(1 * time.Second)
	opts.OnConnect = connectHandler
	opts.OnConnectionLost = connectLostHandler

	// Create and start a client
	client := mqtt.NewClient(opts)
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		log.Fatalf("Error connecting to MQTT broker: %v", token.Error())
	}

	// Subscribe to all topics for this region
	// This will capture:
	// - msh/US/CA/Motherlode/2/e/# (binary protobuf data)
	// - msh/US/CA/Motherlode/2/json/# (JSON formatted data)
	topic := mqttTopicPrefix + "/#"
	token := client.Subscribe(topic, 0, nil)
	token.Wait()
	fmt.Printf("Subscribed to topic: %s\n", topic)

	// Wait for interrupt signal to gracefully shutdown
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	<-sig

	// Unsubscribe and disconnect
	fmt.Println("Unsubscribing and disconnecting...")
	token = client.Unsubscribe(topic)
	token.Wait()
	client.Disconnect(250)
}
