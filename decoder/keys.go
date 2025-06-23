package decoder

import (
	"encoding/base64"
	"fmt"
	"sync"
)

// DefaultPrivateKey is the key used by pseudo public channels
const DefaultPrivateKey = "1PG7OiApB1nwvP+rz05pAQ=="

// ChannelKeys maps channelId to privateKey
var channelKeys = make(map[string][]byte)
var channelKeysMutex sync.RWMutex

// AddChannelKey adds a new channel key to the map
func AddChannelKey(channelId, base64Key string) error {
	key, err := base64.StdEncoding.DecodeString(base64Key)
	if err != nil {
		return fmt.Errorf("invalid base64 key: %v", err)
	}

	// Ensure the key is properly padded to be a valid AES key length
	key = PadKey(key)

	channelKeysMutex.Lock()
	defer channelKeysMutex.Unlock()

	channelKeys[channelId] = key
	return nil
}

// GetChannelKey retrieves a channel key from the map, or returns the default key if not found
func GetChannelKey(channelId string) []byte {
	channelKeysMutex.RLock()
	defer channelKeysMutex.RUnlock()

	if key, ok := channelKeys[channelId]; ok {
		return key
	}

	// Return the default key if no specific key is found
	defaultKey, _ := base64.StdEncoding.DecodeString(DefaultPrivateKey)
	return PadKey(defaultKey)
}

// ClearChannelKeys removes all channel keys
func ClearChannelKeys() {
	channelKeysMutex.Lock()
	defer channelKeysMutex.Unlock()

	channelKeys = make(map[string][]byte)
}

// ListChannelKeys returns a map of all channel IDs and their keys (base64 encoded)
func ListChannelKeys() map[string]string {
	channelKeysMutex.RLock()
	defer channelKeysMutex.RUnlock()

	result := make(map[string]string)
	for id, key := range channelKeys {
		result[id] = base64.StdEncoding.EncodeToString(key)
	}
	return result
}

// RemoveChannelKey removes a channel key from the map
func RemoveChannelKey(channelId string) {
	channelKeysMutex.Lock()
	defer channelKeysMutex.Unlock()

	delete(channelKeys, channelId)
}

// IsChannelConfigured checks if a channel has a specific key configured
func IsChannelConfigured(channelId string) bool {
	channelKeysMutex.RLock()
	defer channelKeysMutex.RUnlock()

	_, ok := channelKeys[channelId]
	return ok
}

// PadKey ensures the key is properly padded to be a valid AES key length (16, 24, or 32 bytes)
func PadKey(key []byte) []byte {
	// If key length is already valid, return as is
	if len(key) == 16 || len(key) == 24 || len(key) == 32 {
		return key
	}

	// Pad to the next valid AES key length
	if len(key) < 16 {
		paddedKey := make([]byte, 16)
		copy(paddedKey, key)
		return paddedKey
	} else if len(key) < 24 {
		paddedKey := make([]byte, 24)
		copy(paddedKey, key)
		return paddedKey
	} else {
		paddedKey := make([]byte, 32)
		copy(paddedKey, key)
		return paddedKey
	}
}
