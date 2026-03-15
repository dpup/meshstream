import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Packet, PortNum } from "../../lib/types";

export type LinkSource =
  | "traceroute"
  | "neighbor_info"
  | "zero_hop"
  | "relay_inferred"
  | "unknown";

export interface LinkObservation {
  key: string;
  nodeA: number; // lower numeric node ID
  nodeB: number; // higher numeric node ID
  snrAtoB?: number; // SNR in dB at nodeB receiving from nodeA
  snrBtoA?: number; // SNR in dB at nodeA receiving from nodeB
  rssiAtoB?: number; // RSSI in dBm at nodeB receiving from nodeA (gateway-measured)
  sourceAtoB: LinkSource; // confidence for snrAtoB direction
  sourceBtoA: LinkSource; // confidence for snrBtoA direction
  viaMqtt?: boolean; // true if any observation crossed an MQTT bridge
  lastSeen: number; // unix timestamp
  hopCount?: number; // total traceroute path length
}

interface TopologyState {
  links: Record<string, LinkObservation>;
  // packetKey → timestamp for dedup (traceroute + neighborInfo)
  processedTraceroutes: Record<string, number>;
}

const initialState: TopologyState = {
  links: {},
  processedTraceroutes: {},
};

const SOURCE_CONFIDENCE: Record<LinkSource, number> = {
  traceroute: 4,
  neighbor_info: 3,
  zero_hop: 2,
  relay_inferred: 1,
  unknown: 0,
};

const MAX_LINKS = 2000;

// Upsert a directed observation: sender transmitted, receiver measured snr/rssi.
// Updates the canonical link entry, applying per-direction confidence rules.
function upsertObservation(
  state: TopologyState,
  sender: number,
  receiver: number,
  snr: number | undefined,
  rssi: number | undefined,
  source: LinkSource,
  viaMqtt: boolean,
  timestamp: number,
  hopCount?: number
): void {
  const nodeA = Math.min(sender, receiver);
  const nodeB = Math.max(sender, receiver);
  const key = `${nodeA}-${nodeB}`;

  if (!state.links[key]) {
    state.links[key] = {
      key,
      nodeA,
      nodeB,
      sourceAtoB: "unknown",
      sourceBtoA: "unknown",
      lastSeen: timestamp,
    };
  }

  const link = state.links[key];
  link.lastSeen = Math.max(link.lastSeen, timestamp);
  if (viaMqtt) link.viaMqtt = true;
  if (hopCount !== undefined) link.hopCount = hopCount;

  // "sender→receiver": if sender===nodeA, this is AtoB (nodeB received from nodeA)
  const isAtoB = sender === nodeA;
  const currentSource: LinkSource = isAtoB
    ? link.sourceAtoB
    : link.sourceBtoA;

  if (
    currentSource === "unknown" ||
    SOURCE_CONFIDENCE[source] > SOURCE_CONFIDENCE[currentSource]
  ) {
    if (isAtoB) {
      link.sourceAtoB = source;
      if (snr !== undefined) link.snrAtoB = snr;
      if (rssi !== undefined) link.rssiAtoB = rssi;
    } else {
      link.sourceBtoA = source;
      if (snr !== undefined) link.snrBtoA = snr;
      // No rssi for BtoA — only gateway-measured (AtoB) rssi is tracked
    }
  }
}

function resolvePortNum(portNum: PortNum | string): PortNum | undefined {
  if (typeof portNum === "number") return portNum;
  const n = PortNum[portNum as keyof typeof PortNum];
  return typeof n === "number" ? n : undefined;
}

function processTopology(
  state: TopologyState,
  packet: Packet,
  timestamp: number,
  nodeIds: number[]
): void {
  const { data } = packet;

  // ── Zero-hop observations (no dedup; each gateway copy is independent) ──
  if (
    data.hopStart !== undefined &&
    data.hopLimit !== undefined &&
    data.hopStart === data.hopLimit &&
    data.gatewayId?.startsWith("!")
  ) {
    const gatewayNum = parseInt(data.gatewayId.substring(1), 16);
    if (!isNaN(gatewayNum) && data.from !== gatewayNum) {
      upsertObservation(
        state,
        data.from,
        gatewayNum,
        data.rxSnr,
        data.rxRssi,
        "zero_hop",
        !!data.viaMqtt,
        timestamp
      );
    }
  }

  const portNum = resolvePortNum(data.portNum);

  // ── Traceroute replies ──
  if (
    portNum === PortNum.TRACEROUTE_APP &&
    !data.wantResponse &&
    data.routeDiscovery
  ) {
    const packetKey = `!${data.from.toString(16).toLowerCase()}_${data.id}`;
    if (state.processedTraceroutes[packetKey]) return;
    state.processedTraceroutes[packetKey] = timestamp;

    const rd = data.routeDiscovery;

    // Forward path: data.to → ...route → data.from
    const forwardPath = [data.to, ...(rd.route ?? []), data.from];
    const snrTowards = rd.snrTowards ?? [];
    const hopCount = forwardPath.length;

    for (let i = 0; i < forwardPath.length - 1; i++) {
      const cap = Math.min(snrTowards.length, forwardPath.length - 1);
      const snr = i < cap ? snrTowards[i] / 4 : undefined;
      upsertObservation(
        state,
        forwardPath[i],     // sender
        forwardPath[i + 1], // receiver
        snr,
        undefined,
        "traceroute",
        !!data.viaMqtt,
        timestamp,
        hopCount
      );
    }

    // Return path: data.from → ...routeBack → data.to
    const returnPath = [data.from, ...(rd.routeBack ?? []), data.to];
    const snrBack = rd.snrBack ?? [];

    for (let i = 0; i < returnPath.length - 1; i++) {
      const cap = Math.min(snrBack.length, returnPath.length - 1);
      const snr = i < cap ? snrBack[i] / 4 : undefined;
      upsertObservation(
        state,
        returnPath[i],
        returnPath[i + 1],
        snr,
        undefined,
        "traceroute",
        !!data.viaMqtt,
        timestamp,
        hopCount
      );
    }
    return;
  }

  // ── NeighborInfo packets ──
  if (portNum === PortNum.NEIGHBORINFO_APP && data.neighborInfo) {
    const ni = data.neighborInfo;
    const broadcaster = ni.nodeId;
    const packetKey = `!${broadcaster.toString(16).toLowerCase()}_${data.id}`;
    if (state.processedTraceroutes[packetKey]) return;
    state.processedTraceroutes[packetKey] = timestamp;

    for (const neighbor of ni.neighbors ?? []) {
      // broadcaster received from neighbor → sender=neighbor, receiver=broadcaster
      upsertObservation(
        state,
        neighbor.nodeId,
        broadcaster,
        neighbor.snr,
        undefined,
        "neighbor_info",
        !!data.viaMqtt,
        timestamp
      );
    }
    return;
  }

  // ── relay_node inferred links (1-hop packets with known relay) ──
  if (
    data.hopStart !== undefined &&
    data.hopLimit !== undefined &&
    data.hopStart - data.hopLimit === 1 &&
    data.relayNode !== undefined &&
    data.relayNode !== 0 &&
    data.gatewayId?.startsWith("!")
  ) {
    const relayByte = data.relayNode & 0xff;
    const candidates = nodeIds.filter((id) => (id & 0xff) === relayByte);
    if (candidates.length === 1) {
      const relay = candidates[0];
      const gatewayNum = parseInt(data.gatewayId.substring(1), 16);
      if (!isNaN(gatewayNum)) {
        // from → relay
        upsertObservation(
          state,
          data.from,
          relay,
          undefined,
          undefined,
          "relay_inferred",
          !!data.viaMqtt,
          timestamp
        );
        // relay → gateway
        upsertObservation(
          state,
          relay,
          gatewayNum,
          undefined,
          undefined,
          "relay_inferred",
          !!data.viaMqtt,
          timestamp
        );
      }
    }
  }
}

const topologySlice = createSlice({
  name: "topology",
  initialState,
  reducers: {
    processTopologyPacket: (
      state,
      action: PayloadAction<{
        packet: Packet;
        timestamp: number;
        nodeIds: number[];
      }>
    ) => {
      const { packet, timestamp, nodeIds } = action.payload;

      // Prune edges and dedup entries older than 24 hours
      const cutoff = timestamp - 86400;
      for (const key of Object.keys(state.links)) {
        if (state.links[key].lastSeen < cutoff) delete state.links[key];
      }
      for (const key of Object.keys(state.processedTraceroutes)) {
        if (state.processedTraceroutes[key] < cutoff)
          delete state.processedTraceroutes[key];
      }

      processTopology(state, packet, timestamp, nodeIds);

      // Enforce 2000-edge cap: remove oldest when over limit
      const linkCount = Object.keys(state.links).length;
      if (linkCount > MAX_LINKS) {
        const sorted = Object.entries(state.links).sort(
          ([, a], [, b]) => a.lastSeen - b.lastSeen
        );
        const toRemove = sorted.slice(0, linkCount - MAX_LINKS);
        for (const [key] of toRemove) delete state.links[key];
      }
    },
    clearTopology: (state) => {
      state.links = {};
      state.processedTraceroutes = {};
    },
  },
});

export const { processTopologyPacket, clearTopology } = topologySlice.actions;
export default topologySlice.reducer;
