package mqtt

import (
	"fmt"
	"time"

	"github.com/dpup/prefab/logging"
	mqtt "github.com/eclipse/paho.mqtt.golang"

	"meshstream/decoder"
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
	logger          logging.Logger
}

// NewClient creates a new MQTT client with the provided configuration
func NewClient(config Config, logger logging.Logger) *Client {
	return &Client{
		config:          config,
		decodedMessages: make(chan *Packet, 100),
		done:            make(chan struct{}),
		logger:          logger.Named("mqtt.client"),
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
	c.logger.Infof("Subscribed to topic: %s", c.config.Topic)

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

// messageHandler processes incoming MQTT messages
func (c *Client) messageHandler(client mqtt.Client, msg mqtt.Message) {
	c.logger.Debugf("Received message from topic: %s", msg.Topic())

	// Parse the topic structure
	topicInfo, err := decoder.ParseTopic(msg.Topic())
	if err != nil {
		c.logger.Errorw("Error parsing topic",
			"error", err,
			"topic", msg.Topic(),
			"payload_hex", fmt.Sprintf("%x", msg.Payload()),
		)
		return
	}

	// Process different message formats
	switch topicInfo.Format {
	case "e", "c", "map":
		// Binary encoded protobuf message
		data := decoder.DecodeMessage(msg.Payload(), topicInfo)

		// Create packet with both the data and topic info
		packet := NewPacket(data, topicInfo)

		// Send the decoded message to the channel, but don't block if buffer is full
		select {
		case c.decodedMessages <- packet:
			// Message sent successfully
		case <-c.done:
			// Client is shutting down
			return
		default:
			// Channel buffer is full, log a warning and drop the message
			c.logger.Warn("Message buffer full, dropping message")
		}

	case "json":
		// TODO: Add support for JSON format messages in the future
		c.logger.Debugf("Ignoring JSON format message from topic: %s", msg.Topic())

	default:
		// Unsupported format, log and ignore
		c.logger.Infow("Unsupported format", "format", topicInfo.Format, "topic", msg.Topic())
	}
}

// connectHandler is called when the client connects to the broker
func (c *Client) connectHandler(client mqtt.Client) {
	c.logger.Info("Connected to MQTT Broker")
}

// connectionLostHandler is called when the client loses connection
func (c *Client) connectionLostHandler(client mqtt.Client, err error) {
	c.logger.Errorw("Connection lost", "error", err)
}