---
status: pending
priority: p3
issue_id: "011"
tags: [code-review, quality, cleanup, backend]
dependencies: []
---

# Dead Code: mustParseDuration in main.go

## Problem Statement

`mustParseDuration` is defined in `main.go` but never called. `durationFromEnv` is used everywhere instead.

## Findings

- **File:** `main.go`, lines 111-118
- Function defined, zero call sites
- Leftover scaffolding from earlier iteration

## Proposed Solutions

### Option A: Delete the function
- **Effort:** Trivial
- **Risk:** None

## Acceptance Criteria

- [ ] `mustParseDuration` removed from `main.go`
- [ ] `make build` still passes

## Work Log

- 2026-03-15: Identified by architecture-strategist review agent
