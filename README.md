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

This project includes the Meshtastic protocol buffer definitions in the `proto/` directory. To decode the packets:

1. Install protoc (Protocol Buffer Compiler):
   - Visit https://github.com/protocolbuffers/protobuf/releases and download the appropriate version
   - Install the Go protobuf plugin: `go install google.golang.org/protobuf/cmd/protoc-gen-go@latest`

2. Generate Go code from protocol buffer definitions:
   ```
   protoc --go_out=. --go_opt=paths=source_relative proto/meshtastic/*.proto proto/nanopb.proto
   ```

3. Implement packet decoding in the application

Note: The current version only logs raw packets to the terminal. Future updates will include full packet decoding functionality.

## MQTT Configuration

- Broker: mqtt.bayme.sh
- Username: meshdev
- Password: large4cats
- Topic prefix: msh/US/CA/Motherlode