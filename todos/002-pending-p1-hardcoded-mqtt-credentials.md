---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, security, credentials, configuration]
dependencies: []
---

# Hardcoded MQTT Credentials in Source Code

## Problem Statement

`meshdev` / `large4cats` are committed as default flag values in `main.go`. Anyone reading the source or forking the repo has these credentials. Operators who deploy without setting environment variables silently use these known-public credentials, believing they have a private configuration.

## Findings

- **File:** `main.go`, lines 73-74
- `getEnv("MQTT_USERNAME", "meshdev")` and `getEnv("MQTT_PASSWORD", "large4cats")` expose credentials in source
- Credentials appear in `--help` output and any build artifact
- While these are community broker credentials (not a private service), they are real auth credentials enabling broker access

## Proposed Solutions

### Option A: Empty defaults + startup validation (Recommended)
Use `""` as the default for both fields. Add a startup check that logs a warning (or hard-fails if a `--require-auth` flag is set) when credentials are empty.
- **Pros:** Forces operators to be explicit; no credentials in source
- **Effort:** Small
- **Risk:** Low (may break zero-config dev setups)

### Option B: Document-only approach
Keep defaults but add a prominent comment and README warning.
- **Pros:** Zero code change
- **Cons:** Credentials still in source; doesn't protect production deployments
- **Effort:** Trivial
- **Risk:** Medium

## Recommended Action

_Option A. At minimum remove the password default; a username default of "meshdev" is less sensitive but should also go._

## Technical Details

- **Affected file:** `main.go`, lines 73-74
- **Related:** `MQTT_USERNAME` / `MQTT_PASSWORD` env vars already supported — just remove the hardcoded fallback values

## Acceptance Criteria

- [ ] No credential values appear in source code as string literals
- [ ] Server starts cleanly with credentials provided via env vars
- [ ] Server logs a clear message when credentials are not configured

## Work Log

- 2026-03-15: Identified by security-sentinel review agent
