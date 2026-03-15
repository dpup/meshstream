---
status: pending
priority: p3
issue_id: "010"
tags: [code-review, security, information-disclosure, backend]
dependencies: []
---

# Internal Error Details Leaked to Browser Clients via decodeError

## Problem Statement

Full Go error strings including channel names and parse error details are placed in the `decodeError` field and streamed to all browser clients. This leaks which channels are configured, internal protobuf error messages, and potentially version/path information.

## Findings

- **File:** `decoder/decoder.go`, lines 313-315
- `"PRIVATE_CHANNEL: failed to parse decrypted data on unconfigured channel '%s': %v"` — channel name + Go error exposed
- All connected clients receive this in SSE stream
- Confirms channel key configuration to any observer

## Proposed Solutions

### Option A: Strip detail from decodeError before SSE; log server-side
Set `decodeError` to a short code (`"PRIVATE_CHANNEL"`, `"PARSE_ERROR"`, `"DECRYPT_FAILED"`) for the wire format. Log the full error server-side at debug level.
- **Effort:** Small
- **Risk:** Low (developers lose some frontend visibility — mitigated by server logs)

## Recommended Action

_Option A. Server logs preserve the detail for debugging; clients see only opaque codes._

## Technical Details

- **Affected files:** `decoder/decoder.go`, all `data.DecodeError = fmt.Sprintf(...)` callsites

## Acceptance Criteria

- [ ] `decodeError` field sent to clients contains only short error codes, not Go error strings
- [ ] Full error detail is logged at the server
- [ ] Frontend can still distinguish error types from the short codes

## Work Log

- 2026-03-15: Identified by security-sentinel review agent
