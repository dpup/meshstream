---
status: pending
priority: p2
issue_id: "004"
tags: [code-review, backend, sse, go, protocol]
dependencies: []
---

# http.Error Called After SSE Headers Already Sent

## Problem Statement

In `server.go`, `http.Error()` is called in the client-disconnect, shutdown, and channel-closed cases after `w.WriteHeader(http.StatusOK)` and SSE headers have already been written. This produces `superfluous response.WriteHeader call` log noise and, more critically, writes HTTP error text into the SSE event stream body, corrupting the stream framing for any still-connected client.

## Findings

- **File:** `server/server.go`, lines 236-240, 245-249, 262-264
- `w.WriteHeader(http.StatusOK)` + SSE headers written at line ~203
- `http.Error()` calls in `<-notify`, `<-s.shutdown`, and `!ok` cases write to an already-open response body
- In the client-disconnect case this is harmless (connection is dead)
- In the `!ok` channel case the client may still be alive and receives garbled data

## Proposed Solutions

### Option A: Replace http.Error with plain return (Recommended)
In all three cases, simply `return` after logging. The SSE client handles reconnection automatically; no error response is needed on the already-open stream.
- **Effort:** Small
- **Risk:** Low

### Option B: Flush a `data: error\n\n` SSE event before closing
Send a proper SSE event indicating shutdown, then return without calling `http.Error`.
- **Effort:** Small
- **Risk:** Low (slightly more client-visible information)

## Recommended Action

_Option A — just return. SSE clients reconnect automatically._

## Technical Details

- **Affected file:** `server/server.go`

## Acceptance Criteria

- [ ] No `http.Error` calls after SSE headers have been written
- [ ] No `superfluous response.WriteHeader call` log warnings during normal client disconnect
- [ ] SSE stream body is never corrupted with HTTP error text

## Work Log

- 2026-03-15: Identified by architecture-strategist review agent
