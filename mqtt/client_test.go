package mqtt

import (
	"testing"
	"time"

	"github.com/dpup/prefab/logging"
	meshtreampb "meshstream/generated/meshstream"
)

// TestClientConfig verifies that the client can be created with a config
func TestClientConfig(t *testing.T) {
	config := Config{
		Broker:   "test.mosquitto.org",
		Username: "test",
		Password: "test",
		ClientID: "test-client",
		Topic:    "test/topic",
	}

	testLogger := logging.NewDevLogger().Named("test")
	client := NewClient(config, testLogger)
	if client == nil {
		t.Fatal("Expected client to be created, got nil")
	}

	if client.config.Broker != config.Broker {
		t.Errorf("Expected broker to be %s, got %s", config.Broker, client.config.Broker)
	}

	if client.config.Topic != config.Topic {
		t.Errorf("Expected topic to be %s, got %s", config.Topic, client.config.Topic)
	}

	// Check that channels are initialized
	if client.decodedMessages == nil {
		t.Error("Expected decodedMessages channel to be initialized")
	}

	if client.done == nil {
		t.Error("Expected done channel to be initialized")
	}

	// Check buffer capacity
	if cap(client.decodedMessages) != 100 {
		t.Errorf("Expected decodedMessages buffer capacity to be 100, got %d", cap(client.decodedMessages))
	}
}

// This test is a mock test and doesn't actually connect to MQTT
// It just verifies that the messages channel works as expected
func TestMessagesChannel(t *testing.T) {
	testLogger := logging.NewDevLogger().Named("test")
	client := NewClient(Config{}, testLogger)
	ch := client.Messages()

	// Verify we get the channel
	if ch == nil {
		t.Fatal("Expected messages channel, got nil")
	}

	// Test we can read from the channel
	go func() {
		msg := &meshtreampb.Packet{}
		client.decodedMessages <- msg
	}()

	select {
	case <-ch:
		// Successfully received a message
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Timed out waiting for message from channel")
	}
}
