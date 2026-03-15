---
status: pending
priority: p2
issue_id: "005"
tags: [code-review, backend, concurrency, go, mqtt]
dependencies: []
---

# Broker dispatchLoop Self-Deadlock on Source Channel Close

## Problem Statement

When the MQTT source channel closes, `dispatchLoop` calls `b.Close()`. `Close` calls `b.wg.Wait()`. But `dispatchLoop` is running in the goroutine counted by `b.wg`, so `wg.Wait()` will never return — deadlock. The current shutdown order in `main.go` avoids this path, but the ordering dependency is implicit and undocumented. A future refactor inverting shutdown order would deadlock silently.

## Findings

- **File:** `mqtt/broker.go`, lines 193-199
- `dispatchLoop` calls `b.Close()` when source channel closes
- `Close` calls `b.wg.Wait()`, waiting for `dispatchLoop` to finish
- `dispatchLoop` is blocked inside `Close` → deadlock
- Current `main.go` shutdown order (`broker.Close()` before `mqttClient.Disconnect()`) avoids triggering this, but the safety is fragile

## Proposed Solutions

### Option A: Send signal to Close rather than calling it directly (Recommended)
Have `dispatchLoop` close an internal `loopDone` channel rather than calling `b.Close()`. Have `b.Close()` check if `loopDone` is already closed to avoid double-work.
- **Effort:** Small-Medium
- **Risk:** Low

### Option B: Use context cancellation
Pass a `context.Context` to `dispatchLoop`. When source closes, cancel the context. `Close` also cancels the context and waits for the loop to exit via `wg.Wait()`.
- **Effort:** Medium
- **Risk:** Low

### Option C: Add comment documenting the ordering constraint
Document that `broker.Close()` must be called before `mqttClient.Disconnect()`.
- **Effort:** Trivial
- **Cons:** Fragile; future refactors will miss it
- **Risk:** Medium

## Recommended Action

_Option A or B. At minimum add a comment (Option C) as immediate mitigation, then refactor to remove the ordering dependency._

## Technical Details

- **Affected file:** `mqtt/broker.go`
- **Related:** `main.go` shutdown sequence

## Acceptance Criteria

- [ ] Broker shuts down cleanly regardless of whether `broker.Close()` or MQTT disconnect is called first
- [ ] No goroutine leaks on shutdown
- [ ] Shutdown order is explicit and enforced, not accidental

## Work Log

- 2026-03-15: Identified by architecture-strategist review agent
