/**
 * TypeScript definitions for the Meshstream protocol buffers
 */

// Enum for PortNum corresponding to meshtastic.PortNum
export enum PortNum {
  UNKNOWN_APP = 0,
  TEXT_MESSAGE_APP = 1,
  REMOTE_HARDWARE_APP = 2,
  POSITION_APP = 3,
  NODEINFO_APP = 4,
  ROUTING_APP = 5,
  ADMIN_APP = 6,
  TEXT_MESSAGE_COMPRESSED_APP = 7,
  WAYPOINT_APP = 8,
  AUDIO_APP = 9,
  REPLY_APP = 32,
  IP_TUNNEL_APP = 33,
  SERIAL_APP = 64,
  STORE_FORWARD_APP = 65,
  RANGE_TEST_APP = 66,
  TELEMETRY_APP = 67,
  PRIVATE_APP = 68,
  // ATAK_FORWARDER = 68, // This is a duplicate of PRIVATE_APP
  DETECTION_SENSOR_APP = 69,
  ZPS_APP = 93,
  SIMULATOR_APP = 94,
  TRACEROUTE_APP = 95,
  NEIGHBORINFO_APP = 96,
  PAXCOUNTER_APP = 97,
  MAP_REPORT_APP = 98,
  ALERT_APP = 99,
  ATAK_PLUGIN = 100,
  POWERSTRESS_APP = 101,
  RETICULUM_TUNNEL_APP = 102,
}

// Different payload types based on the Meshtastic protocol
export interface Position {
  latitude: number;
  longitude: number;
  altitude: number;
  time: number;
  [key: string]: any; // For additional properties
}

export interface User {
  id: string;
  longName: string;
  shortName: string;
  [key: string]: any; // For additional properties
}

export interface Telemetry {
  time: number;
  [key: string]: any; // For other telemetry fields
}

export interface Waypoint {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  [key: string]: any; // For additional properties
}

export interface RouteDiscovery {
  [key: string]: any;
}

export interface NeighborInfo {
  [key: string]: any;
}

export interface MapReport {
  [key: string]: any;
}

export interface HardwareMessage {
  [key: string]: any;
}

export interface Routing {
  [key: string]: any;
}

export interface AdminMessage {
  [key: string]: any;
}

export interface Paxcount {
  [key: string]: any;
}

// TopicInfo contains parsed information about a Meshtastic MQTT topic
export interface TopicInfo {
  full_topic: string;
  region_path: string;
  version: string;
  format: string;
  channel: string;
  user_id: string;
}

// Data provides a flattened structure for decoded Meshtastic packets
export interface Data {
  // From Service Envelope
  channel_id: string;
  gateway_id: string;

  // From Mesh Packet
  id: number;
  from: number;
  to: number;
  hop_limit: number;
  hop_start: number;
  want_ack: boolean;
  priority: string;
  via_mqtt: boolean;
  next_hop: number;
  relay_node: number;

  // From Data
  port_num: PortNum;
  
  // Payload is one of these types, depending on port_num
  text_message?: string;
  binary_data?: string; // Base64 encoded binary data
  position?: Position;
  node_info?: User;
  telemetry?: Telemetry;
  waypoint?: Waypoint;
  route_discovery?: RouteDiscovery;
  neighbor_info?: NeighborInfo;
  compressed_text?: string; // Base64 encoded
  map_report?: MapReport;
  remote_hardware?: HardwareMessage;
  routing?: Routing;
  admin?: AdminMessage;
  audio_data?: string; // Base64 encoded
  alert?: string;
  reply?: string;
  ip_tunnel?: string; // Base64 encoded
  paxcounter?: Paxcount;
  serial_app?: string; // Base64 encoded
  store_forward?: string; // Base64 encoded
  range_test?: string;
  zps_app?: string; // Base64 encoded
  simulator?: string; // Base64 encoded
  atak_plugin?: string; // Base64 encoded
  powerstress?: string; // Base64 encoded
  reticulum_tunnel?: string; // Base64 encoded
  private_app?: string; // Base64 encoded
  detection_sensor?: string;

  // Additional Data fields
  request_id?: number;
  reply_id?: number;
  emoji?: number;
  dest?: number;
  source?: number;
  want_response?: boolean;

  // Error tracking
  decode_error?: string;
}

// Packet represents a complete decoded MQTT message
export interface Packet {
  info: TopicInfo;
  data: Data;
}

/**
 * Type definitions for SSE events
 */
export interface InfoEvent {
  type: "info";
  data: string;
}

export interface MessageEvent {
  type: "message";
  data: Packet; // Strongly typed with the Packet interface
}

export interface BadDataEvent {
  type: "bad_data";
  data: string; // Raw data that failed to parse
}

export type StreamEvent = InfoEvent | MessageEvent | BadDataEvent;

export type StreamEventHandler = (event: StreamEvent) => void;