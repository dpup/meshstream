# Fixture Data for Testing

This directory contains sample JSON data files that represent different types of Meshtastic packets. These fixtures can be used for testing the web application without requiring a live MQTT connection.

## Available Fixtures

- **text_message.json**: A simple text message sent over the Meshtastic network
- **position.json**: A position update with GPS coordinates
- **nodeinfo.json**: Information about a node in the Meshtastic network
- **telemetry.json**: Device and environmental telemetry data
- **map_report.json**: A report containing multiple nodes and their positions
- **waypoint.json**: A waypoint/point of interest 
- **decode_error.json**: An example of a packet that couldn't be properly decoded

## Using the Fixtures

These JSON files match the format that would be received from the server's SSE endpoint, which delivers data in the format:

```
event: message
data: {... JSON payload ...}
```

The fixtures can be used in unit tests, for mocking the API during development, or as examples for documentation.

## Data Structure

Each fixture follows this general pattern:

```json
{
  "info": {
    "fullTopic": "msh/REGION_PATH/2/e/CHANNELNAME/USERID",
    "regionPath": "...",
    "version": "2",
    "format": "e",
    "channel": "...",
    "userId": "..."
  },
  "data": {
    "channelId": "...",
    "gatewayId": "...",
    "id": 1234567890,
    "from": 1234567890,
    "to": 4294967295,
    "hopLimit": 3,
    "hopStart": 3,
    "priority": "...",
    "portNum": "...",
    "...": "...", // Payload-specific fields
    "requestId": 0,
    "replyId": 0,
    "wantResponse": false
  }
}
```

The payload fields in `data` depend on the message type, as indicated by the `portNum` field.