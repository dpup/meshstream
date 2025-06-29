import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Packet,
  DeviceMetrics,
  EnvironmentMetrics,
  Position,
  User,
  Telemetry,
  MapReport,
} from "../../lib/types";

// Types for aggregated data
export interface NodeData {
  nodeId: number;
  shortName?: string;
  longName?: string;
  macAddr?: string;
  hwModel?: string;
  lastHeard: number; // timestamp
  position?: Position;
  deviceMetrics?: DeviceMetrics;
  environmentMetrics?: EnvironmentMetrics;
  batteryLevel?: number;
  snr?: number;
  messageCount: number;
  textMessageCount: number;
  channelId?: string;
  gatewayId?: string;
  // Fields for gateway nodes
  isGateway?: boolean;
  observedNodeCount?: number;
  // MapReport payload for this node
  mapReport?: MapReport;
  // User-specific fields
  isLicensed?: boolean;
  role?: string;
  publicKey?: string;
}

export interface TextMessage {
  id: number;
  from: number;
  fromName?: string;
  text: string;
  timestamp: number;
  channelId: string;
  gatewayId: string;
}

export interface GatewayData {
  gatewayId: string;
  channelIds: string[]; // Changed from Set to array for Redux serialization
  lastHeard: number;
  nodeCount: number;
  messageCount: number;
  textMessageCount: number;
  observedNodes: number[]; // Array of node IDs observed through this gateway
}

export interface ChannelData {
  channelId: string;
  gateways: string[]; // Changed from Set to array for Redux serialization
  nodes: number[]; // Changed from Set to array for Redux serialization
  messageCount: number;
  textMessageCount: number; // Count specifically for text messages
  lastMessage?: number;
}

interface AggregatorState {
  nodes: Record<number, NodeData>;
  gateways: Record<string, GatewayData>;
  channels: Record<string, ChannelData>;
  messages: Record<string, TextMessage[]>;
  selectedNodeId?: number;
  // Track already processed packet IDs to prevent duplicates
  processedPackets: Record<string, boolean>;
}

const initialState: AggregatorState = {
  nodes: {},
  gateways: {},
  channels: {},
  messages: {},
  processedPackets: {},
};

// Helper to create a key for message collections (by channelId)
const getChannelKey = (channelId: string): string => {
  return `channel_${channelId}`;
};

// Maximum number of messages to keep per channel
const MAX_MESSAGES_PER_CHANNEL = 100;

// Function to process a packet and update the state accordingly
const processPacket = (state: AggregatorState, packet: Packet) => {
  const { data } = packet;
  const { channelId, gatewayId } = data;
  const nodeId = data.from;
  const timestamp = data.rxTime || Math.floor(Date.now() / 1000);

  // Skip packets without valid from/id
  if (nodeId === undefined || data.id === undefined) {
    return;
  }

  // Create a unique packet key (same format as in packetSlice)
  const nodeIdHex = `!${nodeId.toString(16).toLowerCase()}`;
  const packetKey = `${nodeIdHex}_${data.id}`;

  // Check if we've already processed this packet
  const isNewPacket = !state.processedPackets[packetKey];

  // Always mark this packet as processed
  state.processedPackets[packetKey] = true;

  // Update gateway data
  // Handle both cases:
  // 1. Gateway relaying data from other nodes (gatewayId != nodeId)
  // 2. Gateway reporting its own data (gatewayId = nodeId)
  if (gatewayId && nodeId !== undefined) {
    const gatewayNodeHex = `!${nodeId.toString(16).toLowerCase()}`;
    const isSelfReport = gatewayId === gatewayNodeHex;
    
    if (!state.gateways[gatewayId]) {
      state.gateways[gatewayId] = {
        gatewayId,
        channelIds: [],
        lastHeard: timestamp,
        nodeCount: 0,
        messageCount: 0,
        textMessageCount: 0,
        observedNodes: [],
      };
    }

    const gateway = state.gateways[gatewayId];
    gateway.lastHeard = Math.max(gateway.lastHeard, timestamp);
    gateway.messageCount++;
    if (data.textMessage) {
      gateway.textMessageCount++;
    }

    if (channelId && !gateway.channelIds.includes(channelId)) {
      gateway.channelIds.push(channelId);
    }

    // Only record as observed if it's not the gateway itself reporting
    if (!isSelfReport && !gateway.observedNodes.includes(nodeId)) {
      gateway.observedNodes.push(nodeId);
    }
    
    // If this is a gateway reporting its own data via MAP_REPORT, create a node entry for it
    if (isSelfReport && data.mapReport) {
      // Extract gateway's node ID from the gateway ID
      const gatewayNodeId = parseInt(gatewayId.substring(1), 16);
      
      // Make sure we have a node entry for this gateway
      if (!state.nodes[gatewayNodeId]) {
        state.nodes[gatewayNodeId] = {
          nodeId: gatewayNodeId,
          lastHeard: timestamp,
          messageCount: 1,
          textMessageCount: 0,
          isGateway: true,
          gatewayId: gatewayId
        };
      }
      
      // Update the node with map report data
      const gatewayNode = state.nodes[gatewayNodeId];
      gatewayNode.isGateway = true;
      gatewayNode.mapReport = { ...data.mapReport };
      gatewayNode.lastHeard = Math.max(gatewayNode.lastHeard, timestamp);
      
      // Copy relevant fields from MapReport to the node object
      if (data.mapReport.longName) {
        gatewayNode.longName = data.mapReport.longName;
      }
      if (data.mapReport.shortName) {
        gatewayNode.shortName = data.mapReport.shortName;
      }
      if (data.mapReport.hwModel !== undefined) {
        gatewayNode.hwModel = data.mapReport.hwModel.toString();
      }
      
      // Create position info from MapReport
      if (data.mapReport.latitudeI !== undefined && data.mapReport.longitudeI !== undefined) {
        gatewayNode.position = {
          latitudeI: data.mapReport.latitudeI,
          longitudeI: data.mapReport.longitudeI,
          altitude: data.mapReport.altitude,
          time: timestamp,
          precisionBits: data.mapReport.positionPrecision
        };
      }
    }
  }

  if (!isNewPacket) {
    // Channel and node stats will already have been updated.
    return;
  }

  // Update channel data
  if (channelId) {
    if (!state.channels[channelId]) {
      state.channels[channelId] = {
        channelId,
        gateways: [],
        nodes: [],
        messageCount: 0,
        textMessageCount: 0,
      };
    }

    const channel = state.channels[channelId];
    channel.messageCount++;
    
    // Track text messages separately
    if (data.textMessage) {
      channel.textMessageCount++;
    }
    
    channel.lastMessage = timestamp;

    if (gatewayId && !channel.gateways.includes(gatewayId)) {
      channel.gateways.push(gatewayId);
    }

    if (nodeId !== undefined && !channel.nodes.includes(nodeId)) {
      channel.nodes.push(nodeId);
    }
  }

  // Update node data based on various packet types
  if (nodeId !== undefined) {
    // Initialize node if not exists
    if (!state.nodes[nodeId]) {
      state.nodes[nodeId] = {
        nodeId,
        lastHeard: timestamp,
        messageCount: 0,
        textMessageCount: 0,
      };
    }

    const node = state.nodes[nodeId];
    node.lastHeard = Math.max(node.lastHeard, timestamp);
    node.messageCount++;
    if (data.textMessage) {
      node.textMessageCount++;
    }

    // Set channelId and gatewayId if available
    if (channelId) {
      node.channelId = channelId;
    }
    if (gatewayId) {
      node.gatewayId = gatewayId;
    }

    // Update node info if available
    if (data.nodeInfo) {
      updateNodeInfo(node, data.nodeInfo);
    }

    // Update position if available
    if (data.position) {
      node.position = { ...data.position };
    }

    // Update telemetry if available
    if (data.telemetry) {
      updateTelemetry(node, data.telemetry);
    }
    
    // Update MapReport if available
    if (data.mapReport) {
      node.mapReport = { ...data.mapReport };
      
      // Also update node fields from MapReport if they're missing
      if (!node.longName && data.mapReport.longName) {
        node.longName = data.mapReport.longName;
      }
      if (!node.shortName && data.mapReport.shortName) {
        node.shortName = data.mapReport.shortName;
      }
      if (!node.hwModel && data.mapReport.hwModel !== undefined) {
        node.hwModel = 
          data.mapReport.hwModel.toString(); // Store as string to match User.hwModel format
      }
      
      // Update position from MapReport if node doesn't have position
      if (!node.position && data.mapReport.latitudeI !== undefined && data.mapReport.longitudeI !== undefined) {
        node.position = {
          latitudeI: data.mapReport.latitudeI,
          longitudeI: data.mapReport.longitudeI,
          altitude: data.mapReport.altitude,
          time: timestamp, // Use packet time
          // Set precisionBits from positionPrecision if available
          precisionBits: data.mapReport.positionPrecision
        };
      }
    }
  }

  // Process text messages - only for new packets to avoid duplicates
  // Debug text message processing
  if (data.textMessage) {
    console.log(`[Aggregator] Processing text message: "${data.textMessage}" on channel ${channelId}, isNewPacket: ${isNewPacket}`);
  }
  
  if (data.textMessage && nodeId !== undefined && channelId) {
    const channelKey = getChannelKey(channelId);

    if (!state.messages[channelKey]) {
      state.messages[channelKey] = [];
    }

    // Add the new message
    const nodeName =
      state.nodes[nodeId]?.shortName || state.nodes[nodeId]?.longName;

    // Ensure we have a stable ID for the message
    const messageId = data.id !== undefined ? data.id : Math.floor(Math.random() * 1000000);
    
    const newMessage = {
      id: messageId,
      from: nodeId,
      fromName: nodeName,
      text: data.textMessage,
      timestamp,
      channelId,
      gatewayId: gatewayId || "",
    };
    
    state.messages[channelKey].push(newMessage);
    
    console.log(`[Aggregator] Added message to channel ${channelId}:`, newMessage);
    console.log(`[Aggregator] Channel ${channelId} now has ${state.messages[channelKey].length} messages`);
    

    // Sort messages by timestamp (newest first)
    state.messages[channelKey].sort((a, b) => b.timestamp - a.timestamp);

    // Limit the number of messages per channel
    if (state.messages[channelKey].length > MAX_MESSAGES_PER_CHANNEL) {
      state.messages[channelKey] = state.messages[channelKey].slice(
        0,
        MAX_MESSAGES_PER_CHANNEL
      );
    }
  }
};

// Helper to update node info from User object
const updateNodeInfo = (node: NodeData, nodeInfo: User) => {
  if (nodeInfo.shortName) node.shortName = nodeInfo.shortName;
  if (nodeInfo.longName) node.longName = nodeInfo.longName;
  if (nodeInfo.macaddr) node.macAddr = nodeInfo.macaddr;
  if (nodeInfo.hwModel) node.hwModel = nodeInfo.hwModel;
  if (nodeInfo.batteryLevel !== undefined)
    node.batteryLevel = nodeInfo.batteryLevel;
  if (nodeInfo.snr !== undefined) node.snr = nodeInfo.snr;
  if (nodeInfo.isLicensed !== undefined) node.isLicensed = nodeInfo.isLicensed;
  if (nodeInfo.role) node.role = nodeInfo.role;
  if (nodeInfo.publicKey) node.publicKey = nodeInfo.publicKey;
};

// Helper to update telemetry data
const updateTelemetry = (node: NodeData, telemetry: Telemetry) => {
  if (telemetry.deviceMetrics) {
    node.deviceMetrics = { ...telemetry.deviceMetrics };

    // Update battery level from device metrics if available
    if (telemetry.deviceMetrics.batteryLevel !== undefined) {
      node.batteryLevel = telemetry.deviceMetrics.batteryLevel;
    }
  }

  if (telemetry.environmentMetrics) {
    node.environmentMetrics = { ...telemetry.environmentMetrics };
  }
};

const aggregatorSlice = createSlice({
  name: "aggregator",
  initialState,
  reducers: {
    processNewPacket: (state, action: PayloadAction<Packet>) => {
      processPacket(state, action.payload);
    },
    clearAggregatedData: (state) => {
      state.nodes = {};
      state.gateways = {};
      state.channels = {};
      state.messages = {};
      state.processedPackets = {};
      state.selectedNodeId = undefined;
    },
    selectNode: (state, action: PayloadAction<number | undefined>) => {
      state.selectedNodeId = action.payload;
    },
  },
});

export const { processNewPacket, clearAggregatedData, selectNode } =
  aggregatorSlice.actions;

export default aggregatorSlice.reducer;
