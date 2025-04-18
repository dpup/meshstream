# Meshtastic MQTT Protocol Structure

## Topic Structure

The Meshtastic MQTT topic structure follows this pattern:
```
msh/REGION/2/e/CHANNELNAME/USERID
```

- `msh`: Fixed prefix for all Meshtastic topics
- `REGION`: Geographic region code (e.g., `US`, `EU`, `AU`)
- `2`: Protocol version
- `e`: Encrypted channel indicator (versions before 2.3.0 used `/c/` instead)
- `CHANNELNAME`: The channel name used in the Meshtastic network
- `USERID`: Unique identifier for the device, formats include:
  - `!` followed by hex characters for MAC address based IDs
  - `+` followed by phone number for Signal-based IDs

## Message Types

### Protobuf Messages (Binary)
Topic pattern: `msh/REGION/2/e/CHANNELNAME/USERID`
- Raw MeshPacket transmissions in protobuf format
- Can be encrypted or unencrypted based on channel settings

### JSON Messages
Topic pattern: `msh/REGION/2/json/CHANNELNAME/USERID`
- Structured JSON payloads with fields like:
  - `id`: Message ID
  - `from`: Node ID of sender
  - `to`: Node ID of recipient (or blank for broadcast)
  - `payload`: The actual message content
  - `timestamp`: Time the message was received

Note: JSON format is not supported on nRF52 platform devices.

### Special Topics
- MQTT Downlink: `msh/REGION/2/json/mqtt/`
  - Used for sending instructions to gateway nodes

## Important Notes

- The public MQTT server implements a zero-hop policy (only direct messages)
- JSON messages may include specific data types like:
  - NodeInfo
  - Telemetry
  - Text Messages
  - Position Updates
- Position data on public servers has reduced precision for privacy
- Binary messages use the protocol buffers format defined in the Meshtastic codebase

This corrects the previous assumption that the topic structure was `msh/REGION/STATE/NAME`, which was incorrect.