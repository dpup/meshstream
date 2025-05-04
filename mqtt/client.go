package mqtt

import (
	"fmt"
	"time"

	"github.com/dpup/prefab/logging"
	mqtt "github.com/eclipse/paho.mqtt.golang"

	"meshstream/decoder"
	meshtreampb "meshstream/generated/meshstream"
)

// Config holds configuration for the MQTT client
type Config struct {
	// Connection settings
	Broker   string
	Username string
	Password string
	ClientID string
	Topic    string
	
	// Connection tuning parameters
	KeepAlive        int           // Keep alive interval in seconds (default: 60)
	ConnectTimeout   time.Duration // Connection timeout (default: 30s)
	PingTimeout      time.Duration // Ping timeout (default: 10s)
	MaxReconnectTime time.Duration // Maximum time between reconnect attempts (default: 5m)
	UseTLS           bool          // Whether to use TLS/SSL (default: false)
	TLSPort          int           // TLS port to use if UseTLS is true (default: 8883)
}

// Client manages the MQTT connection and message processing
type Client struct {
	config          Config
	client          mqtt.Client
	decodedMessages chan *meshtreampb.Packet
	done            chan struct{}
	logger          logging.Logger
}

// NewClient creates a new MQTT client with the provided configuration
func NewClient(config Config, logger logging.Logger) *Client {
	return &Client{
		config:          config,
		decodedMessages: make(chan *meshtreampb.Packet, 100),
		done:            make(chan struct{}),
		logger:          logger.Named("mqtt.client"),
	}
}

// Connect establishes a connection to the MQTT broker
func (c *Client) Connect() error {
	// Set default values for optional parameters
	keepAlive := 60
	if c.config.KeepAlive > 0 {
		keepAlive = c.config.KeepAlive
	}
	
	connectTimeout := 30 * time.Second
	if c.config.ConnectTimeout > 0 {
		connectTimeout = c.config.ConnectTimeout
	}
	
	pingTimeout := 10 * time.Second
	if c.config.PingTimeout > 0 {
		pingTimeout = c.config.PingTimeout
	}
	
	maxReconnectTime := 5 * time.Minute
	if c.config.MaxReconnectTime > 0 {
		maxReconnectTime = c.config.MaxReconnectTime
	}
	
	// Determine protocol and port
	protocol := "tcp"
	port := 1883
	if c.config.UseTLS {
		protocol = "ssl"
		port = 8883
		if c.config.TLSPort > 0 {
			port = c.config.TLSPort
		}
	}
	
	// Log detailed connection settings
	c.logger.Infow("Connecting to MQTT broker with settings",
		"broker", c.config.Broker,
		"port", port,
		"protocol", protocol,
		"clientID", c.config.ClientID,
		"username", c.config.Username,
		"passwordLength", len(c.config.Password),
		"topic", c.config.Topic,
		"keepAlive", keepAlive,
		"connectTimeout", connectTimeout,
		"pingTimeout", pingTimeout,
		"maxReconnectTime", maxReconnectTime,
		"useTLS", c.config.UseTLS,
	)

	opts := mqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("%s://%s:%d", protocol, c.config.Broker, port))
	opts.SetClientID(c.config.ClientID)
	opts.SetUsername(c.config.Username)
	opts.SetPassword(c.config.Password)
	opts.SetDefaultPublishHandler(c.messageHandler)
	opts.SetKeepAlive(time.Duration(keepAlive) * time.Second)
	opts.SetConnectTimeout(connectTimeout)
	opts.SetPingTimeout(pingTimeout)
	opts.SetMaxReconnectInterval(maxReconnectTime)
	opts.SetAutoReconnect(true)
	opts.SetCleanSession(true)
	opts.OnConnect = c.connectHandler
	opts.OnConnectionLost = c.connectionLostHandler
	opts.OnReconnecting = c.reconnectingHandler

	// Create and start the client
	c.client = mqtt.NewClient(opts)
	if token := c.client.Connect(); token.Wait() && token.Error() != nil {
		c.logger.Errorw("Failed to connect to MQTT broker", 
			"error", token.Error(),
			"broker", c.config.Broker,
			"clientID", c.config.ClientID)
		return fmt.Errorf("error connecting to MQTT broker: %v", token.Error())
	}

	// Subscribe to the configured topic
	token := c.client.Subscribe(c.config.Topic, 0, nil)
	token.Wait()
	if token.Error() != nil {
		c.logger.Errorw("Failed to subscribe to topic",
			"error", token.Error(),
			"topic", c.config.Topic)
		return fmt.Errorf("error subscribing to topic %s: %v", c.config.Topic, token.Error())
	}
	
	c.logger.Infof("Successfully subscribed to topic: %s", c.config.Topic)

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
func (c *Client) Messages() <-chan *meshtreampb.Packet {
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
	c.logger.Infow("Connected to MQTT Broker", 
		"broker", c.config.Broker,
		"clientID", c.config.ClientID,
		"topic", c.config.Topic)
}

// connectionLostHandler is called when the client loses connection
func (c *Client) connectionLostHandler(client mqtt.Client, err error) {
	c.logger.Errorw("Connection lost", 
		"error", err,
		"errorType", fmt.Sprintf("%T", err),
		"broker", c.config.Broker,
		"clientID", c.config.ClientID)
}

// reconnectingHandler is called when the client is attempting to reconnect
func (c *Client) reconnectingHandler(client mqtt.Client, opts *mqtt.ClientOptions) {
	c.logger.Infow("Attempting to reconnect to MQTT broker",
		"broker", c.config.Broker,
		"clientID", c.config.ClientID)
}
