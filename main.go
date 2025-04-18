package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

const (
	mqttBroker     = "mqtt.bayme.sh"
	mqttUsername   = "meshdev"
	mqttPassword   = "large4cats"
	mqttTopicPrefix = "msh/US/CA/Motherlode"
)

var messagePubHandler mqtt.MessageHandler = func(client mqtt.Client, msg mqtt.Message) {
	fmt.Printf("Received message from topic: %s\n", msg.Topic())
	fmt.Printf("Raw payload: %v\n", msg.Payload())
	
	// TODO: When protobuf compilation is set up, we can decode the messages
	// using the Meshtastic protocol definitions in the proto/ directory
	// Example decoding logic will be added in a future update
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

	// Subscribe to topic
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