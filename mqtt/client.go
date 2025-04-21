package mqtt

import (
	"fmt"
	"log"
	"time"

	"meshstream/decoder"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

// Config holds configuration for the MQTT client
type Config struct {
	Broker   string
	Username string
	Password string
	ClientID string
	Topic    string
}

// Client manages the MQTT connection and message processing
type Client struct {
	config          Config
	client          mqtt.Client
	decodedMessages chan *Packet
	done            chan struct{}
}

// NewClient creates a new MQTT client with the provided configuration
func NewClient(config Config) *Client {
	return &Client{
		config:          config,
		decodedMessages: make(chan *Packet, 100), // Buffer up to 100 messages
		done:            make(chan struct{}),
	}
}

// Connect establishes a connection to the MQTT broker
func (c *Client) Connect() error {
	// Create MQTT client options
	opts := mqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("tcp://%s:1883", c.config.Broker))
	opts.SetClientID(c.config.ClientID)
	opts.SetUsername(c.config.Username)
	opts.SetPassword(c.config.Password)
	opts.SetDefaultPublishHandler(c.messageHandler)
	opts.SetPingTimeout(1 * time.Second)
	opts.OnConnect = c.connectHandler
	opts.OnConnectionLost = c.connectionLostHandler

	// Create and start the client
	c.client = mqtt.NewClient(opts)
	if token := c.client.Connect(); token.Wait() && token.Error() != nil {
		return fmt.Errorf("error connecting to MQTT broker: %v", token.Error())
	}

	// Subscribe to the configured topic
	token := c.client.Subscribe(c.config.Topic, 0, nil)
	token.Wait()
	log.Printf("Subscribed to topic: %s\n", c.config.Topic)

	return nil
}

// Disconnect cleanly disconnects from the MQTT broker
func (c *Client) Disconnect() {
	close(c.done)
	token := c.client.Unsubscribe(c.config.Topic)
	token.Wait()
	c.client.Disconnect(250)
}

// Messages returns a channel of decoded messages
// The consumer should read from this channel to receive decoded messages
func (c *Client) Messages() <-chan *Packet {
	return c.decodedMessages
}

// These are intentionally left empty as we'll use the instance methods below

// messageHandler processes incoming MQTT messages
func (c *Client) messageHandler(client mqtt.Client, msg mqtt.Message) {
	log.Printf("Received message from topic: %s\n", msg.Topic())

	// Parse the topic structure
	topicInfo, err := decoder.ParseTopic(msg.Topic())
	if err != nil {
		log.Printf("Error parsing topic: %v\n", err)
		log.Printf("Raw topic: %s\n", msg.Topic())
		log.Printf("Raw payload: %x\n", msg.Payload())
		return
	}

	// Process different message formats
	switch topicInfo.Format {
	case "e", "c", "map":
		// Binary encoded protobuf message
		decodedPacket := decoder.DecodeMessage(msg.Payload(), topicInfo)
		
		// Create packet with both the decoded packet and topic info
		packet := &Packet{
			DecodedPacket: decodedPacket,
			TopicInfo:     topicInfo,
		}
		
		// Send the decoded message to the channel, but don't block if buffer is full
		select {
		case c.decodedMessages <- packet:
			// Message sent successfully
		case <-c.done:
			// Client is shutting down
			return
		default:
			// Channel buffer is full, log a warning and drop the message
			log.Println("Warning: Message buffer full, dropping message")
		}
	
	case "json":
		// TODO: Add support for JSON format messages in the future
		log.Printf("Ignoring JSON format message from topic: %s\n", msg.Topic())
	
	default:
		// Unsupported format, log and ignore
		log.Printf("Unsupported format: %s from topic: %s\n", topicInfo.Format, msg.Topic())
	}
}

// connectHandler is called when the client connects to the broker
func (c *Client) connectHandler(client mqtt.Client) {
	log.Println("Connected to MQTT Broker!")
}

// connectionLostHandler is called when the client loses connection
func (c *Client) connectionLostHandler(client mqtt.Client, err error) {
	log.Printf("Connection lost: %v\n", err)
}