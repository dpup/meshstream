---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, frontend, react, architecture, quality]
dependencies: []
---

# NetworkMap.tsx Functions Redeclared in Component Body Every Render

## Problem Statement

`initializeMap`, `updateNodeMarkers`, `createMarker`, `updateMarker`, and `showInfoWindow` are declared inside the component function body without `useCallback`. They are redeclared on every render, cannot be properly listed in dependency arrays, and are the direct cause of the `/* eslint-disable react-hooks/exhaustive-deps */` at the top of the file. The planned topology polyline feature will make this worse if it follows the same pattern.

## Findings

- **File:** `web/src/components/dashboard/NetworkMap.tsx`, lines 261-455, line 1 (`eslint-disable`)
- `tryInitializeMap` useCallback (line 133) lists `updateNodeMarkers` and `initializeMap` in deps — but these change every render, defeating memoization
- The `eslint-disable` suppression acknowledges the problem but doesn't fix it
- Adding polyline management code to this pattern makes the component increasingly difficult to reason about

## Proposed Solutions

### Option A: Extract to module-level pure functions (Recommended)
Move functions that don't access component state/refs directly (e.g., `getMarkerIcon`, marker content builders) to module-level. Pass refs/state as parameters.
- **Pros:** Cleanest; enables proper useCallback dependency arrays; allows tree-shaking
- **Effort:** Medium
- **Risk:** Low

### Option B: Wrap all in useCallback with correct deps
Convert all functions to useCallback with proper dependency lists. Remove the eslint-disable.
- **Pros:** Fixes the hook rules without restructuring
- **Cons:** Still keeps large functions in the component body
- **Effort:** Medium
- **Risk:** Low

### Option C: Leave as-is, document for topology addition
Accept the pattern and apply it consistently for topology polylines. Remove the eslint-disable only when refactoring later.
- **Effort:** None now
- **Cons:** Technical debt grows; makes the topology feature harder to test
- **Risk:** Medium (ongoing)

## Recommended Action

_At minimum, do Option A for module-level pure helpers before adding topology polyline code. The topology feature addition is a natural trigger for this cleanup._

## Technical Details

- **Affected file:** `web/src/components/dashboard/NetworkMap.tsx`
- This should be addressed before or alongside the topology polyline rendering implementation

## Acceptance Criteria

- [ ] The `/* eslint-disable react-hooks/exhaustive-deps */` comment is removed
- [ ] All `useCallback` hooks have accurate, complete dependency arrays
- [ ] Adding polyline management code does not require more eslint suppression

## Work Log

- 2026-03-15: Identified by architecture-strategist review agent
