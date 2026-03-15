# Node Topology Tracking Design

**Date:** 2026-03-15
**Status:** Approved

## Overview

Track and visualize RF link topology between Meshtastic mesh nodes. Most needed fields already exist; two fields (`rx_snr`, `rx_rssi`) require a small backend addition (proto field + decoder extraction only).

The result is a topology graph of `LinkObservation` edges rendered as colored polylines on the existing Google Maps view, with additional connection data surfaced on the node detail page.

---

## Required Backend Change (small)

`rx_snr` and `rx_rssi` are present in `MeshPacket` in `mesh.proto` (fields 8 and 12) but are not currently extracted into the meshstream `Data` message. Add them:

**`proto/meshstream/meshstream.proto`** — add inside `Data`:
```protobuf
float rx_snr = 62;   // SNR at receiving gateway (dB)
int32 rx_rssi = 63;  // RSSI at receiving gateway (dBm)
```

**`decoder/decoder.go`** — add two lines in `DecodeMessage` alongside the existing hop field extractions:
```go
data.RxSnr = packet.GetRxSnr()
data.RxRssi = packet.GetRxRssi()
```

Run `make gen-proto` to regenerate Go and TypeScript types. This is the only backend change — no logic changes, no new endpoints.

---

## Data Sources

Four sources contribute to the topology graph, ranked by confidence:

### 1. Traceroute Responses (highest confidence)

**Condition:** `portNum === TRACEROUTE_APP` and `wantResponse === false`

Traceroute *requests* (`wantResponse === true`) are silently skipped — they carry a partially-built path and no return data. Only the completed reply (`wantResponse === false`) has a full round-trip path.

**Deduplication:** Skip if `packetKey` (= `!${from.toString(16)}_${id}`) was already processed for traceroute. Track a separate `processedTraceroutes` set in topology state.

The reply packet: `from = destination node`, `to = origin node`.

**Forward path:**
```
path = [data.to, ...routeDiscovery.route, data.from]
// N = route.length + 2 nodes, N-1 edges
// snrTowards[i] / 4 = SNR in dB at path[i+1] receiving from path[i]
// iterate i = 0 .. N-2, capped at Math.min(snrTowards.length, N-1)
```

**Return path:**
```
returnPath = [data.from, ...routeDiscovery.routeBack, data.to]
// M = routeBack.length + 2 nodes, M-1 edges
// snrBack[i] / 4 = SNR in dB at returnPath[i+1] receiving from returnPath[i]
// iterate i = 0 .. M-2, capped at Math.min(snrBack.length, M-1)
```

Each consecutive pair is an individual directed edge. Both directions for the same physical link are stored independently as `snrAtoB` / `snrBtoA`.

If `routeDiscovery` is undefined, or `route` is empty/undefined, attempt to extract only the direct `data.to ↔ data.from` edge with no SNR data.

### 2. Zero-Hop MQTT Observations (continuous, passive)

**Condition:** `hopStart === hopLimit` and `gatewayId` starts with `!`

**Deduplication:** None — intentionally process all copies. Different gateways deliver different `rxSnr`/`rxRssi` values for the same transmission. Each copy yields an independent edge between `from` and that specific gateway.

```
nodeA = packet.from
nodeB = parseInt(gatewayId.substring(1), 16)
snrAtoB = data.rxSnr    // SNR at gateway receiving from nodeA (dB)
rssiAtoB = data.rxRssi  // RSSI at gateway receiving from nodeA (dBm)
```

**Note on `rxSnr === 0` and `rxRssi === 0`:** Proto3 encodes unset fields as 0. A true 0 dB SNR reading is rare but valid. This design accepts the trade-off: store the SNR/RSSI value unconditionally and let the display treat 0 as a valid weak reading (colored red). Do not skip zero-valued SNR.

**`viaMqtt` semantics:** `data.viaMqtt` (from `MeshPacket`) is set `true` by Meshtastic firmware when the packet entered the mesh via an MQTT downlink (i.e., it was injected from the internet into the mesh rather than originating from a local RF transmission). A zero-hop observation with `viaMqtt === true` means the link between `from` and the gateway may not be a pure RF hop. Set `edge.viaMqtt = true` when `data.viaMqtt === true`. This is stored on the edge as a display hint — de-emphasize MQTT-bridged links visually.

**Non-`!` prefixed gateway IDs** (e.g., `+phonenumber`): Skip — do not attempt to parse as a node ID.

### 3. NeighborInfo Packets

**Condition:** `portNum === NEIGHBORINFO_APP`

**Deduplication:** Use key `!${neighborInfo.nodeId.toString(16)}_${data.id}` (broadcaster ID + packet ID). Skip if already in `processedTraceroutes`.

Use `neighborInfo.nodeId` (not `data.from`) as the broadcaster — if relayed, `data.from` is the relay, not the observer. For each neighbor:
```
broadcaster = neighborInfo.nodeId
neighbor    = neighbor.nodeId
SNR measured = broadcaster receiving from neighbor (no /4 scaling)

Canonical assignment: nodeA = min(broadcaster, neighbor), nodeB = max(broadcaster, neighbor)
  if broadcaster === nodeA: this is snrAtoB  (nodeA received from nodeB)
  if broadcaster === nodeB: this is snrBtoA  (nodeB received from nodeA)
```

### 4. `relay_node` Inferred Links

**Condition:** `hopStart - hopLimit === 1` and `relayNode !== 0` and `gatewayId` starts with `!`

`relayNode` is `packet.data.relayNode` (already decoded into `Data` as `relayNode: number`). It contains the last byte (8 bits) of the relay node's full ID. The node store to search is passed via the action payload as `nodeIds: number[]` (computed in `__root.tsx` as `Object.keys(store.getState().aggregator.nodes).map(Number)` before dispatch). Search for nodes where `(nodeId & 0xFF) === relayNode`. If exactly one candidate: record two edges with no SNR, source `relay_inferred`:
```
from → relay (from is sender, relay is candidate node)
relay → gateway (relay to numeric(gatewayId))
```
Zero or multiple candidates: skip silently.

---

## Clever Tricks

### Multi-Gateway Same-Packet Correlation

`processTopologyPacket` receives every raw SSE packet including multiple copies of the same `(from, id)` from different gateways. Zero-hop processing (source 2) intentionally does not deduplicate, so each gateway arrival naturally yields an independent edge. No special detection is needed.

### Hop Count Bounding

Add `hopsFromGateway?: number` to `NodeData` in `aggregatorSlice.ts`. Set it in the existing `processPacket` function (not in topologySlice — avoids cross-slice writes):
```typescript
const hops = (data.hopStart ?? 0) - (data.hopLimit ?? 0);
if (hops >= 0) node.hopsFromGateway = hops;
```

---

## Data Model

### `LinkObservation`

```typescript
interface LinkObservation {
  key: string;              // canonical: `${Math.min(nodeA,nodeB)}-${Math.max(nodeA,nodeB)}`
  nodeA: number;            // lower numeric node ID
  nodeB: number;            // higher numeric node ID
  snrAtoB?: number;         // SNR in dB at nodeB receiving from nodeA
  snrBtoA?: number;         // SNR in dB at nodeA receiving from nodeB
  rssiAtoB?: number;        // RSSI in dBm at nodeB receiving from nodeA (gateway-measured only)
  sourceAtoB: LinkSource;   // confidence for snrAtoB direction; 'unknown' if not yet observed
  sourceBtoA: LinkSource;   // confidence for snrBtoA direction; 'unknown' if not yet observed
  viaMqtt?: boolean;        // true if any observation for this edge crossed an internet bridge
  lastSeen: number;         // unix timestamp
  hopCount?: number;        // total path length (traceroute only): path.length = route.length + 2
}

type LinkSource = 'traceroute' | 'neighbor_info' | 'zero_hop' | 'relay_inferred' | 'unknown';
```

**Note on RSSI asymmetry:** Only `rssiAtoB` is tracked (gateway-measured RSSI on the receiving end). There is no `rssiBtoA` because nodes do not report their received RSSI upstream through MQTT. This is intentional asymmetry.

**New-edge initialization:** When creating a new `LinkObservation`, set both `sourceAtoB` and `sourceBtoA` to `'unknown'`. Then apply the first observation's data to the appropriate direction.

### Merge Strategy

For each incoming observation, determine which direction it provides data for (`AtoB` or `BtoA` based on which node was the receiver). Apply per-direction:

1. Always update `lastSeen` to the newer of current and incoming timestamp
2. If `viaMqtt` is true on the new observation, set `viaMqtt: true` on the edge (never cleared)
3. For the observed direction:
   - If current source is `'unknown'`: set SNR/RSSI and source unconditionally
   - If new source confidence is strictly higher: overwrite SNR/RSSI and source
   - If new source confidence is equal or lower: update `lastSeen` only
4. Source confidence order: `traceroute > neighbor_info > zero_hop > relay_inferred > unknown`

### Redux Reducer Purity

Redux reducers must not call `Date.now()`. The timestamp must come from the action payload. Use `packet.data.rxTime` if available; otherwise compute `Math.floor(Date.now() / 1000)` in the caller (`__root.tsx`) before dispatch.

### Staleness / TTL

At the start of each `processTopologyPacket` call, prune all entries where `actionTimestamp - edge.lastSeen > 86400`. Apply before processing the new packet.

Also prune `processedTraceroutes` entries older than 24h to prevent unbounded growth.

### Maximum Edge Count

Cap at 2000 edges. After TTL pruning and after inserting/updating the new edge: if `Object.keys(state.links).length > 2000`, sort by `lastSeen` ascending and remove the oldest entries until count is ≤ 2000. The just-inserted edge is retained unless it itself is the oldest (extremely unlikely given it was just seen).

---

## Architecture

### New: `topologySlice.ts`

Location: `web/src/store/slices/topologySlice.ts`

```typescript
interface TopologyState {
  links: Record<string, LinkObservation>;
  processedTraceroutes: Record<string, number>; // packetKey → timestamp, for dedup
}
```

Reducers:
- `processTopologyPacket(state, action: PayloadAction<{ packet: Packet; timestamp: number; nodeIds: number[] }>)`
  - `nodeIds` is `Object.keys(store.getState().aggregator.nodes).map(Number)`, passed by caller before dispatch
  1. Prune stale edges and stale processedTraceroutes entries
  2. Extract zero-hop observations (no dedup)
  3. For traceroute: skip if packetKey in processedTraceroutes; otherwise process and set `hopCount = route.length + 2` on each extracted edge
  4. For neighborInfo: skip if dedup key in processedTraceroutes; otherwise process
  5. relay_node inference using `nodeIds` from payload
  6. Enforce 2000-edge cap
- `clearTopology()` — reset to empty state

### Changes to `aggregatorSlice.ts`

Add `hopsFromGateway?: number` to `NodeData` interface. In `processPacket`, after node initialization:
```typescript
const hops = (data.hopStart ?? 0) - (data.hopLimit ?? 0);
if (hops >= 0) node.hopsFromGateway = hops;
```

### Integration in `__root.tsx`

```typescript
// Existing
dispatch(processNewPacket(packet));
dispatch(addPacket(packet));
// New
const timestamp = packet.data.rxTime || Math.floor(Date.now() / 1000);
const nodeIds = Object.keys(store.getState().aggregator.nodes).map(Number);
dispatch(processTopologyPacket({ packet, timestamp, nodeIds }));
```

Also dispatch `clearTopology()` alongside `clearAggregatedData()`.

### `store.ts`

Add `topology: topologyReducer` to the root reducer.

### `NetworkMap.tsx` Rendering

- Add `showLinks: boolean` local state (default `true`). This is per-instance; each `NetworkMap` manages its own toggle independently.
- Read `links` from `useAppSelector((state) => state.topology)`
- `polylinesRef: React.MutableRefObject<Record<string, google.maps.Polyline>>`
- Call `updateLinks(links, nodesWithPosition, showLinks)` after `updateNodeMarkers`

**`updateLinks` logic:**
1. Build a position lookup: `Map<number, {lat, lng}>` from `nodesWithPosition`
2. For each `LinkObservation` in `links`:
   - If either node has no position: skip rendering (keep polyline hidden if it existed)
   - Determine display SNR: `snrAtoB ?? snrBtoA`
   - Color:
     - `>= 5 dB` → `#22c55e` (green)
     - `0–5 dB` → `#eab308` (yellow)
     - `< 0 dB` → `#ef4444` (red)
     - no SNR data → `#6b7280` (gray)
   - Opacity: 0.7 normally; 0.4 if `viaMqtt === true`
   - Create or update `google.maps.Polyline`: strokeWeight 2, strokeColor per above, strokeOpacity per above
   - If `showLinks === false`: set polyline `visible: false`
3. Remove polylines for keys no longer in `state.topology.links`
4. Add to unmount cleanup: iterate `polylinesRef.current` and call `.setMap(null)`

**Toggle button:** Add "Links" `Button` to the map legend row alongside the existing Auto-zoom button.

### `NodeDetail.tsx` Connections Section

Add a "Connections" section below existing node detail content:

- Read `links` from `useAppSelector((state) => state.topology)`
- Read `nodes` from `useAppSelector((state) => state.aggregator.nodes)` for name lookup
- Filter: edges where `link.nodeA === nodeId || link.nodeB === nodeId`
- For each match:
  - Determine neighbor ID: the other end of the edge
  - Display: neighbor name (`nodes[neighbor]?.shortName ?? nodes[neighbor]?.longName ?? '!' + neighbor.toString(16)`)
  - SNR: `→ X dB` (snrAtoB, node→neighbor direction) and `← Y dB` (snrBtoA) if available
  - Source: highest confidence of `sourceAtoB`/`sourceBtoA` (use the confidence ordering), displayed as a badge:
    - `traceroute` → blue
    - `zero_hop` → green
    - `neighbor_info` → yellow
    - `relay_inferred` → gray
  - Last seen: relative time (existing `formatLastSeen` pattern)
  - Via MQTT badge if `viaMqtt === true`
- If no connections: show "No connections observed" in muted text

---

## Error Handling

- **`routeDiscovery` undefined:** Guard with `if (!data.routeDiscovery) return`; skip traceroute processing
- **`route` empty/undefined:** Extract only `data.to ↔ data.from` direct edge with no SNR
- **SNR array length mismatch:** `cap = Math.min(snrTowards.length, path.length - 1)`; never access out of bounds
- **`relay_node` ambiguity:** Zero or multiple 8-bit suffix matches → skip silently
- **Non-`!` prefixed gateway:** Skip zero-hop and relay_inferred processing for that packet
- **`hopsFromGateway` negative:** Can occur if firmware sends inconsistent values; clamp to 0

---

## Files Changed

| File | Change |
|---|---|
| `proto/meshstream/meshstream.proto` | Add `rx_snr` and `rx_rssi` fields |
| `decoder/decoder.go` | Extract `RxSnr` and `RxRssi` |
| `web/src/store/slices/topologySlice.ts` | New file |
| `web/src/store/store.ts` | Add topology reducer |
| `web/src/routes/__root.tsx` | Dispatch `processTopologyPacket` + `clearTopology` |
| `web/src/store/slices/aggregatorSlice.ts` | Add `hopsFromGateway` to `NodeData`, set in `processPacket` |
| `web/src/components/dashboard/NetworkMap.tsx` | Polyline rendering + toggle |
| `web/src/components/dashboard/NodeDetail.tsx` | Connections section |

---

## Out of Scope

- Persisting topology across page refreshes (all state is in-memory, consistent with existing approach)
- Sending traceroute requests from the web UI (read-only observation)
- Rendering edges for nodes without position data (silently skipped)
