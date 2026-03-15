---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, security, cors, auth, backend]
dependencies: []
---

# Wildcard CORS + No Authentication on SSE Endpoint

## Problem Statement

`/api/stream` sets `Access-Control-Allow-Origin: *`, meaning any JavaScript on any origin can subscribe to the full decoded packet feed. There is no authentication at any layer. The `/api/status` endpoint also exposes the MQTT server hostname and subscribed topic to any caller.

## Findings

- **File:** `server/server.go`, line ~182
- `w.Header().Set("Access-Control-Allow-Origin", "*")` on the SSE endpoint
- No API key, session token, or any auth mechanism
- `/api/status` returns `mqttServer` and `mqttTopic` to unauthenticated callers

## Proposed Solutions

### Option A: Restrict CORS to same-origin or configured origin
Replace `*` with a configurable `MESHSTREAM_ALLOWED_ORIGIN` env var. Default to `""` (same-origin only).
- **Effort:** Small
- **Risk:** Low (may break cross-origin dev setups — document the env var)

### Option B: Add optional static token auth
Add an optional `MESHSTREAM_API_TOKEN` env var. If set, require `Authorization: Bearer <token>` or `?token=<token>` on all API requests.
- **Effort:** Small-Medium
- **Risk:** Low

### Option C: No change for local-only deployments
Document that the server is intended for local/trusted network use only.
- **Effort:** Trivial
- **Cons:** Doesn't protect deployments that are inadvertently exposed
- **Risk:** Medium

## Recommended Action

_Option A at minimum (restrict CORS origin). Option B if public deployment is expected._

## Technical Details

- **Affected file:** `server/server.go`

## Acceptance Criteria

- [ ] CORS origin is not `*` in default configuration
- [ ] CORS origin is configurable via environment variable
- [ ] Status endpoint does not expose internal MQTT details without auth (or is documented as intentionally public)

## Work Log

- 2026-03-15: Identified by security-sentinel review agent
