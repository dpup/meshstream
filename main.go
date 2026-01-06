package main

import (
	"flag"
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

// Config holds all the configuration parameters
type Config struct {
	// MQTT Configuration
	MQTTBroker         string
	MQTTUsername       string
	MQTTPassword       string
	MQTTTopicPrefix    string
	MQTTClientID       string
	MQTTKeepAlive      int
	MQTTConnectTimeout time.Duration
	MQTTPingTimeout    time.Duration
	MQTTMaxReconnect   time.Duration
	MQTTUseTLS         bool
	MQTTTLSPort        int

	// Web server configuration
	ServerHost string
	ServerPort string
	StaticDir  string

	// Channel keys configuration (name:key pairs)
	ChannelKeys []string

	// Statistics configuration
	StatsInterval  time.Duration
	CacheSize      int
	VerboseLogging bool
}

// getEnv retrieves an environment variable with the given prefix or returns the default value
func getEnv(key, defaultValue string) string {
	envKey := "MESHSTREAM_" + key
	if val, exists := os.LookupEnv(envKey); exists {
		return val
	}
	return defaultValue
}

// parseConfig parses command line flags and environment variables
func parseConfig() *Config {
	// Print custom usage message
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "MeshStream: A Meshtastic MQTT streaming service\n\n")
		fmt.Fprintf(os.Stderr, "Usage: %s [OPTIONS]\n\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "Options:\n")
		flag.PrintDefaults()
		fmt.Fprintf(os.Stderr, "\nAll options can also be set using environment variables with the MESHSTREAM_ prefix.\n")
		fmt.Fprintf(os.Stderr, "Example: MESHSTREAM_MQTT_BROKER=mqtt.example.com MESHSTREAM_SERVER_PORT=8081 %s\n\n", os.Args[0])
	}

	config := &Config{}

	// MQTT configuration
	flag.StringVar(&config.MQTTBroker, "mqtt-broker", getEnv("MQTT_BROKER", "mqtt.bayme.sh"), "MQTT broker address")
	flag.StringVar(&config.MQTTUsername, "mqtt-username", getEnv("MQTT_USERNAME", "meshdev"), "MQTT username")
	flag.StringVar(&config.MQTTPassword, "mqtt-password", getEnv("MQTT_PASSWORD", "large4cats"), "MQTT password")
	flag.StringVar(&config.MQTTTopicPrefix, "mqtt-topic-prefix", getEnv("MQTT_TOPIC_PREFIX", "msh/US/bayarea"), "MQTT topic prefix")
	flag.StringVar(&config.MQTTClientID, "mqtt-client-id", getEnv("MQTT_CLIENT_ID", "meshstream"), "MQTT client ID")

	// MQTT connection tuning parameters
	flag.IntVar(&config.MQTTKeepAlive, "mqtt-keepalive", intFromEnv("MQTT_KEEPALIVE", 60), "MQTT keep alive interval in seconds")
	flag.DurationVar(&config.MQTTConnectTimeout, "mqtt-connect-timeout", durationFromEnv("MQTT_CONNECT_TIMEOUT", 30*time.Second), "MQTT connection timeout")
	flag.DurationVar(&config.MQTTPingTimeout, "mqtt-ping-timeout", durationFromEnv("MQTT_PING_TIMEOUT", 10*time.Second), "MQTT ping timeout")
	flag.DurationVar(&config.MQTTMaxReconnect, "mqtt-max-reconnect", durationFromEnv("MQTT_MAX_RECONNECT", 5*time.Minute), "MQTT maximum reconnect interval")
	flag.BoolVar(&config.MQTTUseTLS, "mqtt-use-tls", boolFromEnv("MQTT_USE_TLS", false), "Use TLS for MQTT connection")
	flag.IntVar(&config.MQTTTLSPort, "mqtt-tls-port", intFromEnv("MQTT_TLS_PORT", 8883), "MQTT TLS port")

	// Web server configuration
	flag.StringVar(&config.ServerHost, "server-host", getEnv("SERVER_HOST", "localhost"), "Web server host")
	flag.StringVar(&config.ServerPort, "server-port", getEnv("SERVER_PORT", "8080"), "Web server port")
	flag.StringVar(&config.StaticDir, "static-dir", getEnv("STATIC_DIR", "./server/static"), "Directory containing static web files")

	// Channel key configuration (comma separated list of name:key pairs)
	channelKeysDefault := getEnv("CHANNEL_KEYS", "LongFast:"+decoder.DefaultPrivateKey)
	channelKeysFlag := flag.String("channel-keys", channelKeysDefault, "Comma-separated list of channel:key pairs for encrypted channels")

	flag.IntVar(&config.CacheSize, "cache-size", intFromEnv("CACHE_SIZE", 200), "Number of packets to cache for new subscribers")
	flag.BoolVar(&config.VerboseLogging, "verbose", boolFromEnv("VERBOSE_LOGGING", false), "Enable verbose message logging")

	flag.Parse()

	if *channelKeysFlag != "" {
		config.ChannelKeys = strings.Split(*channelKeysFlag, ",")
	}

	// Unique client ID for this process.
	config.MQTTClientID = fmt.Sprintf("%s-%d-%d", config.MQTTClientID, os.Getpid(), time.Now().Unix())

	return config
}

// Helper function to parse duration from environment
func mustParseDuration(durationStr string) time.Duration {
	duration, err := time.ParseDuration(durationStr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Invalid duration format: %s\n", durationStr)
		os.Exit(1)
	}
	return duration
}

// Helper function to parse duration from environment with default
func durationFromEnv(key string, defaultValue time.Duration) time.Duration {
	envVal := getEnv(key, "")
	if envVal == "" {
		return defaultValue
	}
	duration, err := time.ParseDuration(envVal)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Invalid duration format for %s: %s\n", key, envVal)
		return defaultValue
	}
	return duration
}

// Helper function to parse int from environment
func intFromEnv(key string, defaultValue int) int {
	envVal := getEnv(key, "")
	if envVal == "" {
		return defaultValue
	}
	var result int
	_, err := fmt.Sscanf(envVal, "%d", &result)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Invalid integer format for %s: %s\n", key, envVal)
		os.Exit(1)
	}
	return result
}

// Helper function to parse bool from environment
func boolFromEnv(key string, defaultValue bool) bool {
	envVal := getEnv(key, "")
	if envVal == "" {
		return defaultValue
	}

	switch strings.ToLower(envVal) {
	case "true", "yes", "1", "y", "t":
		return true
	case "false", "no", "0", "n", "f":
		return false
	default:
		fmt.Fprintf(os.Stderr, "Invalid boolean format for %s: %s\n", key, envVal)
		os.Exit(1)
		return defaultValue
	}
}

func main() {
	config := parseConfig()
	logger := logging.NewProdLogger().Named("main")

	// Initialize channel keys
	for _, channelKeyPair := range config.ChannelKeys {
		parts := strings.SplitN(channelKeyPair, ":", 2)
		if len(parts) != 2 {
			logger.Errorw("Invalid channel key format, should be 'channel:key'", "pair", channelKeyPair)
			continue
		}

		channelName := parts[0]
		channelKey := parts[1]

		err := decoder.AddChannelKey(channelName, channelKey)
		if err != nil {
			logger.Errorw("Failed to initialize channel key", "channel", channelName, "key", channelKey, "error", err)
		} else {
			logger.Infof("Initialized channel key for '%s'", channelName)
		}
	}

	// Configure and create the MQTT client
	mqttConfig := mqtt.Config{
		// Basic connection parameters
		Broker:   config.MQTTBroker,
		Username: config.MQTTUsername,
		Password: config.MQTTPassword,
		ClientID: config.MQTTClientID,
		Topic:    config.MQTTTopicPrefix + "/#",

		// Advanced connection parameters
		KeepAlive:        config.MQTTKeepAlive,
		ConnectTimeout:   config.MQTTConnectTimeout,
		PingTimeout:      config.MQTTPingTimeout,
		MaxReconnectTime: config.MQTTMaxReconnect,
		UseTLS:           config.MQTTUseTLS,
		TLSPort:          config.MQTTTLSPort,
	}

	mqttClient := mqtt.NewClient(mqttConfig, logger)

	// Connect to the MQTT broker
	if err := mqttClient.Connect(); err != nil {
		logger.Fatalw("Failed to connect to MQTT broker", "error", err)
	}

	// Get the messages channel to receive decoded messages
	messagesChan := mqttClient.Messages()

	// Create a message broker to distribute messages to multiple consumers
	// Cache packets for new subscribers based on configuration
	broker := mqtt.NewBroker(messagesChan, config.CacheSize, logger)
	logger.Infof("Message broker initialized with cache size: %d", config.CacheSize)

	// Create a message logger that subscribes to the broker
	// and also logs to stdout
	messageLogger, err := mqtt.NewMessageLogger(
		broker,
		!config.VerboseLogging,
		logger,
	)
	if err != nil {
		logger.Warnw("Failed to initialize message logger", "error", err)
	} else {
		logger.Infof("Message logger initialized with verbose mode: %t", config.VerboseLogging)
	}

	// Start the web server
	webServer := server.New(server.Config{
		Host:          config.ServerHost,
		Port:          config.ServerPort,
		Broker:        broker,
		Logger:        logger,
		MQTTServer:    config.MQTTBroker,
		MQTTTopicPath: config.MQTTTopicPrefix + "/#",
		StaticDir:     config.StaticDir,
		ChannelKeys:   config.ChannelKeys,
	})

	// Start the server in a goroutine
	go func() {
		logger.Infof("Starting web server at http://%s:%s", config.ServerHost, config.ServerPort)
		if err := webServer.Start(); err != nil {
			logger.Errorw("Web server error", "error", err)
		}
	}()

	// Setup signal handling for graceful shutdown
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)

	// Process messages until interrupt received
	logger.Info("Waiting for messages... Press Ctrl+C to exit")
	logger.Infof("Web server running at http://%s:%s", config.ServerHost, config.ServerPort)

	// Wait for interrupt signal
	<-sig

	// Got an interrupt signal, shutting down
	logger.Info("Shutting down...")

	// Close components in reverse order of creation
	// First stop the web server
	if err := webServer.Stop(); err != nil {
		logger.Errorw("Error stopping web server", "error", err)
	}

	// Then stop the logger
	if messageLogger != nil {
		messageLogger.Close()
	}

	// Close the broker (which will close all subscriber channels)
	broker.Close()

	// Then disconnect the MQTT client
	mqttClient.Disconnect()
}
