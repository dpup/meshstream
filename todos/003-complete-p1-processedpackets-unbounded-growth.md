---
status: complete
priority: p1
issue_id: "003"
tags: [code-review, performance, memory, frontend, redux]
dependencies: []
---

# Unbounded Memory Growth in processedPackets and seenPackets

## Problem Statement

`aggregatorSlice.processedPackets` and `packetSlice.seenPackets` are `Record<string, boolean>` maps that grow forever. Every processed packet adds an entry and nothing ever removes them. A session receiving modest Meshtastic traffic (~1 packet/sec) accumulates tens of thousands of keys over hours. Both maps serialize on every Redux state snapshot, are included in DevTools, and will be included in any future persistence layer.

`processedPackets` is P1 because it's in the hot aggregator path queried on every packet; `seenPackets` (in packetSlice) has the same issue at P2 because it's less frequently queried.

## Findings

- **File:** `web/src/store/slices/aggregatorSlice.ts`, lines 76, 115
- `processedPackets[packetKey] = true` written on every packet, never pruned
- No eviction path; `clearAggregatedData` resets it but requires explicit user action
- **File:** `web/src/store/slices/packetSlice.ts`, lines ~13, ~78-79
- `seenPackets` same pattern; `packets` array is trimmed to 5000 but map is not

## Proposed Solutions

### Option A: Time-based eviction with timestamp map (Recommended)
Change `processedPackets: Record<string, boolean>` to `processedPackets: Record<string, number>` (value = timestamp). On each `processNewPacket` call, prune entries older than a TTL (e.g., 24h). Apply the same pattern to `seenPackets`.
- **Pros:** Consistent with topologySlice TTL pattern already in the spec; self-healing
- **Effort:** Small
- **Risk:** Low

### Option B: Fixed-size LRU cap
Keep only the most recent N packet keys (e.g., 10000). When the cap is exceeded, drop the oldest. Use an insertion-ordered structure or a separate ordered array.
- **Pros:** Hard memory bound
- **Cons:** More complex; need to track insertion order
- **Effort:** Medium
- **Risk:** Low

### Option C: Rely on clearAggregatedData
Document that operators should reload periodically; no code change.
- **Pros:** Zero effort
- **Cons:** Doesn't fix the problem; long-running sessions still leak
- **Risk:** High (ongoing)

## Recommended Action

_Option A — add timestamps to both maps and prune during packet processing. The topologySlice will use the same pattern, so this creates consistency._

## Technical Details

- **Affected files:** `web/src/store/slices/aggregatorSlice.ts`, `web/src/store/slices/packetSlice.ts`
- Pattern: `Record<string, number>` where value is unix timestamp; prune `now - value > TTL` at start of each dispatch

## Acceptance Criteria

- [ ] `processedPackets` entries older than 24h are pruned during packet processing
- [ ] `seenPackets` entries are similarly bounded
- [ ] Deduplication still works correctly after pruning (no duplicate packets in ~24h window)
- [ ] Memory usage stabilizes after hours of packet ingestion

## Work Log

- 2026-03-15: Identified by architecture-strategist review agent
