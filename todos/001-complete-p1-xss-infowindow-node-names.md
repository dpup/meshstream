---
status: complete
priority: p1
issue_id: "001"
tags: [code-review, security, xss, frontend]
dependencies: []
---

# XSS via Node Names in Google Maps InfoWindow

## Problem Statement

`showInfoWindow` in `NetworkMap.tsx` builds an HTML string using `nodeName` (sourced from `node.longName || node.shortName`, which comes from MQTT packets) and passes it to `infoWindowRef.current.setContent(infoContent)`. Google Maps `InfoWindow.setContent` renders its argument as live HTML. A Meshtastic device with a `longName` of `<img src=x onerror=alert(document.cookie)>` will execute arbitrary JavaScript in every viewer's browser.

Attack path: malicious device broadcasts NodeInfo on public MQTT → Go decoder stores it faithfully → SSE streams to browser → Redux stores verbatim → map renders with no sanitization.

## Findings

- **File:** `web/src/components/dashboard/NetworkMap.tsx`, lines 431-451
- `nodeName` is interpolated raw into an HTML template literal
- `infoWindowRef.current.setContent(infoContent)` renders the HTML directly
- All SVG marker templates on lines 344 and 390 use the same unsafe pattern (lower risk currently since values are internally computed, but should be normalized)
- No sanitization at any layer (decoder, SSE, Redux, component)

## Proposed Solutions

### Option A: DOM construction with .textContent (Recommended)
Replace the HTML template literal with `document.createElement` tree. Use `.textContent` for all data-derived values.
- **Pros:** Completely eliminates XSS, no extra dependency, idiomatic
- **Cons:** More verbose than template literal
- **Effort:** Small
- **Risk:** Low

### Option B: Pass Element directly to setContent
Build a `div` element using DOM APIs and pass the element object to `setContent` (which accepts `Element | string`).
- **Pros:** Clean, no string HTML at all
- **Cons:** Slightly more DOM manipulation code
- **Effort:** Small
- **Risk:** Low

### Option C: Add DOMPurify sanitization
Run `nodeName` through `DOMPurify.sanitize()` before interpolation.
- **Pros:** Minimal code change
- **Cons:** Adds a dependency; still uses HTML string pattern; sanitizers can be bypassed
- **Effort:** Small
- **Risk:** Medium (sanitizer bypass potential)

## Recommended Action

_Use Option A — DOM construction. It eliminates the vulnerability class entirely rather than mitigating it._

## Technical Details

- **Affected files:** `web/src/components/dashboard/NetworkMap.tsx`
- **Function:** `showInfoWindow` (line ~412)
- **Data origin:** `data.nodeInfo.longName` / `data.nodeInfo.shortName` from MQTT protobuf

## Acceptance Criteria

- [ ] `showInfoWindow` constructs InfoWindow content using DOM APIs, not HTML strings
- [ ] No user-supplied string data is interpolated into HTML template literals in NetworkMap.tsx
- [ ] A node with `longName = "<script>alert(1)</script>"` renders safely as literal text in the info window

## Work Log

- 2026-03-15: Identified by security-sentinel and architecture-strategist review agents
