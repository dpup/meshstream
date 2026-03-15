---
review_agents:
  - compound-engineering:review:performance-oracle
  - compound-engineering:review:architecture-strategist
  - compound-engineering:review:security-sentinel
  - compound-engineering:review:code-simplicity-reviewer
---

# Meshstream Review Context

This is a Go + React/TypeScript application that:
- Subscribes to Meshtastic MQTT topics and decodes protobuf packets
- Streams decoded packets to browser clients via SSE
- Frontend uses React 19, Redux Toolkit, TanStack Router, and Google Maps API
- All state is in-memory (no database)
- Backend: Go with paho MQTT client and prefab web framework

Key architectural patterns:
- Backend circular buffer (200 packets default) for new client catchup
- Frontend Redux aggregator slice processes all packet types
- Google Maps AdvancedMarkerElement for node visualization
- Protobuf definitions in proto/ generate Go and TypeScript types via make gen-proto
