# Meshstream

A Go application that monitors the Meshtastic MQTT server and logs packets to the terminal.

## Setup

1. Clone this repository
2. Install dependencies:

```
go mod tidy
```

## Running

```
go run main.go
```

## Decoding Meshtastic Packets

This project includes the Meshtastic protocol buffer definitions in the `proto/` directory and a decoder for parsing MQTT packets. The application will automatically decode JSON messages and extract key information from binary messages.

### Protocol Buffer Compilation

To regenerate the protocol buffer Go code:

```
make gen-proto
```

This will:
1. Install the required protoc-gen-go compiler plugin in a local bin/ directory
2. Generate Go code from the protocol buffer definitions
3. Place the generated code in the proto/generated/ directory

### Packet Decoding

The application currently decodes packets in these formats:

1. JSON messages (from topics containing '/json/')
   - Extracts common fields like sender, receiver, and payload
   - Pretty-prints the JSON content

2. Binary messages (from topics containing '/binary/')
   - Shows basic topic information and a hex dump of the binary data

3. Text messages (from topics containing '/text/')
   - Displays the plain text content

The decoder is implemented in the `decoder` package.

## MQTT Configuration

- Broker: mqtt.bayme.sh
- Username: meshdev
- Password: large4cats
- Topic prefix: msh/US/CA/Motherlode