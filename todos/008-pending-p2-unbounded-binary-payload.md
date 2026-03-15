---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, security, backend, memory, dos]
dependencies: []
---

# Unbounded Binary Payload Forwarded to All SSE Clients

## Problem Statement

When decryption produces bytes that are neither valid protobuf nor ASCII, the raw decrypted bytes are stored verbatim in `BinaryData` and forwarded via SSE to all connected clients. There is no size limit on the encrypted payload or the binary blob. A malicious actor on the MQTT feed could craft large packets, causing memory amplification and excessive bandwidth to all SSE subscribers.

## Findings

- **File:** `decoder/decoder.go`, lines 316-318
- Raw decrypted bytes stored in `BinaryData` field with no size cap
- Serialized by `protojson` and streamed to all SSE clients
- One large malicious packet → all connected clients receive it

## Proposed Solutions

### Option A: Add maximum payload size check before decryption (Recommended)
Reject encrypted payloads larger than a configurable limit (e.g., 4KB default). Return a `decodeError` without attempting decryption.
- **Effort:** Small
- **Risk:** Low

### Option B: Drop binary data from SSE stream entirely
When `BinaryData` would be set, replace it with a size indicator only (e.g., `binaryDataSize: 1234`). Don't send the raw bytes to clients.
- **Effort:** Small
- **Risk:** Low (clients lose access to binary payloads they currently can't decode anyway)

## Recommended Action

_Both — add a size check before decryption AND drop binary blobs from SSE output._

## Technical Details

- **Affected file:** `decoder/decoder.go`, lines 316-318
- Reasonable limit: 1KB for most Meshtastic payloads; 4KB as a generous cap

## Acceptance Criteria

- [ ] Encrypted payloads larger than the limit are rejected with a `decodeError`
- [ ] Raw binary bytes are not forwarded to SSE clients
- [ ] Normal Meshtastic packets (all under ~256 bytes) are unaffected

## Work Log

- 2026-03-15: Identified by security-sentinel review agent
