---
status: pending
priority: p3
issue_id: "009"
tags: [code-review, security, http-headers, backend]
dependencies: [001]
---

# No HTTP Security Headers

## Problem Statement

The server sets no `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, or other security headers. A CSP would meaningfully reduce XSS blast radius (finding 001) and constrain resource loading.

## Findings

- **File:** `server/server.go`
- No security middleware layer
- Google Maps API and Fonts load from external origins — a CSP needs to allow these specifically
- `prefab` framework's default header behavior is unknown

## Proposed Solutions

### Option A: Add security headers middleware to the prefab server
Inject headers on all responses: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a CSP allowing `maps.googleapis.com`, `fonts.googleapis.com`, `fonts.gstatic.com`.
- **Effort:** Small
- **Risk:** Low (may need tuning for Google Maps inline styles/scripts)

## Recommended Action

_Option A after fixing finding 001 (XSS). CSP is most effective when combined with fixing the actual XSS root cause._

## Technical Details

- **Affected file:** `server/server.go`

## Acceptance Criteria

- [ ] All HTTP responses include `X-Content-Type-Options: nosniff`
- [ ] All HTTP responses include `X-Frame-Options: DENY`
- [ ] CSP header allows required Google Maps and Fonts origins
- [ ] Google Maps continues to function with the CSP applied

## Work Log

- 2026-03-15: Identified by security-sentinel review agent
