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

// Map of PortNum string names to numeric enum values
export const PortNumByName: Record<string, PortNum> = {
  UNKNOWN_APP: PortNum.UNKNOWN_APP,
  TEXT_MESSAGE_APP: PortNum.TEXT_MESSAGE_APP,
  REMOTE_HARDWARE_APP: PortNum.REMOTE_HARDWARE_APP,
  POSITION_APP: PortNum.POSITION_APP,
  NODEINFO_APP: PortNum.NODEINFO_APP,
  ROUTING_APP: PortNum.ROUTING_APP,
  ADMIN_APP: PortNum.ADMIN_APP,
  TEXT_MESSAGE_COMPRESSED_APP: PortNum.TEXT_MESSAGE_COMPRESSED_APP,
  WAYPOINT_APP: PortNum.WAYPOINT_APP,
  AUDIO_APP: PortNum.AUDIO_APP,
  REPLY_APP: PortNum.REPLY_APP,
  IP_TUNNEL_APP: PortNum.IP_TUNNEL_APP,
  SERIAL_APP: PortNum.SERIAL_APP,
  STORE_FORWARD_APP: PortNum.STORE_FORWARD_APP,
  RANGE_TEST_APP: PortNum.RANGE_TEST_APP,
  TELEMETRY_APP: PortNum.TELEMETRY_APP,
  PRIVATE_APP: PortNum.PRIVATE_APP,
  DETECTION_SENSOR_APP: PortNum.DETECTION_SENSOR_APP,
  ZPS_APP: PortNum.ZPS_APP,
  SIMULATOR_APP: PortNum.SIMULATOR_APP,
  TRACEROUTE_APP: PortNum.TRACEROUTE_APP,
  NEIGHBORINFO_APP: PortNum.NEIGHBORINFO_APP,
  PAXCOUNTER_APP: PortNum.PAXCOUNTER_APP,
  MAP_REPORT_APP: PortNum.MAP_REPORT_APP,
  ALERT_APP: PortNum.ALERT_APP,
  ATAK_PLUGIN: PortNum.ATAK_PLUGIN,
  POWERSTRESS_APP: PortNum.POWERSTRESS_APP,
  RETICULUM_TUNNEL_APP: PortNum.RETICULUM_TUNNEL_APP,
};

// Different payload types based on the Meshtastic protocol
export interface Position {
  latitudeI?: number; // multiply by 1e-7 to get degrees
  longitudeI?: number; // multiply by 1e-7 to get degrees
  altitude?: number; // in meters above MSL
  time: number; // seconds since 1970
  locationSource?: string; // "LOC_UNSET", "LOC_MANUAL", "LOC_INTERNAL", "LOC_EXTERNAL"
  altitudeSource?: string; // "ALT_UNSET", "ALT_MANUAL", "ALT_INTERNAL", "ALT_EXTERNAL", "ALT_BAROMETRIC"
  timestamp?: number; // positional timestamp in integer epoch seconds
  timestampMillisAdjust?: number;
  altitudeHae?: number; // HAE altitude in meters
  altitudeGeoSeparation?: number;
  pdop?: number; // Position Dilution of Precision, in 1/100 units
  hdop?: number; // Horizontal Dilution of Precision
  vdop?: number; // Vertical Dilution of Precision
  gpsAccuracy?: number; // GPS accuracy in mm
  groundSpeed?: number; // in m/s
  groundTrack?: number; // True North track in 1/100 degrees
  fixQuality?: number; // GPS fix quality
  fixType?: number; // GPS fix type 2D/3D
  satsInView?: number; // Satellites in view
  sensorId?: number; // For multiple positioning sensors
  nextUpdate?: number; // Estimated time until next update in seconds
  seqNumber?: number; // Sequence number for this packet
  precisionBits?: number; // Bits of precision set by the sending node
}

export interface User {
  id: string; // Globally unique ID for this user
  longName?: string; // Full name for this user
  shortName?: string; // Very short name, ideally two characters
  macaddr?: string; // MAC address of the device
  hwModel?: string; // Hardware model name
  hasGps?: boolean; // Whether the node has GPS capability
  role?: string; // User's role in the mesh (e.g., "ROUTER")
  snr?: number; // Signal-to-noise ratio
  batteryLevel?: number; // Battery level 0-100
  voltage?: number; // Battery voltage
  channelUtilization?: number; // Channel utilization percentage
  airUtilTx?: number; // Air utilization for transmission
  lastHeard?: number; // Last time the node was heard from
}

// Device metrics for telemetry
export interface DeviceMetrics {
  batteryLevel?: number; // 0-100 (>100 means powered)
  voltage?: number; // Voltage measured
  channelUtilization?: number;
  airUtilTx?: number; // Percent of airtime for transmission used within the last hour
  uptimeSeconds?: number; // How long the device has been running since last reboot (in seconds)
}

// Environment metrics for telemetry
export interface EnvironmentMetrics {
  temperature?: number; // Temperature measured
  relativeHumidity?: number; // Relative humidity percent measured
  barometricPressure?: number; // Barometric pressure in hPA
  gasResistance?: number; // Gas resistance in MOhm
  voltage?: number; // Voltage measured (To be deprecated)
  current?: number; // Current measured (To be deprecated)
  iaq?: number; // IAQ value (0-500)
  distance?: number; // Distance in mm (water level detection)
  lux?: number; // Ambient light (Lux)
  whiteLux?: number; // White light (irradiance)
  irLux?: number; // Infrared lux
  uvLux?: number; // Ultraviolet lux
  windDirection?: number; // Wind direction in degrees (0 = North, 90 = East)
  windSpeed?: number; // Wind speed in m/s
  weight?: number; // Weight in KG
  windGust?: number; // Wind gust in m/s
  windLull?: number; // Wind lull in m/s
  radiation?: number; // Radiation in µR/h
  rainfall1h?: number; // Rainfall in the last hour in mm
  rainfall24h?: number; // Rainfall in the last 24 hours in mm
  soilMoisture?: number; // Soil moisture measured (% 1-100)
  soilTemperature?: number; // Soil temperature measured (°C)
}

// Main telemetry interface
export interface Telemetry {
  time: number; // seconds since 1970
  deviceMetrics?: DeviceMetrics;
  environmentMetrics?: EnvironmentMetrics;
  // Other telemetry types could be added as needed (PowerMetrics, AirQualityMetrics, etc.)
}

export interface Waypoint {
  id: number; // ID of the waypoint
  latitudeI?: number; // multiply by 1e-7 to get degrees
  longitudeI?: number; // multiply by 1e-7 to get degrees
  expire?: number; // Time the waypoint is to expire (epoch)
  lockedTo?: number; // If greater than zero, nodenum allowed to update the waypoint
  name?: string; // Name of the waypoint - max 30 chars
  description?: string; // Description of the waypoint - max 100 chars
  icon?: number; // Designator icon for the waypoint (unicode emoji)
}

export interface RouteDiscovery {
  route?: number[]; // The list of nodenums this packet has visited
  snrTowards?: number[]; // The list of SNRs (in dB, scaled by 4) in the route towards destination
  routeBack?: number[]; // The list of nodenums the packet has visited on the way back
  snrBack?: number[]; // The list of SNRs (in dB, scaled by 4) in the route back
}

// A neighbor in the mesh
export interface Neighbor {
  nodeId: number; // Node ID of neighbor
  snr: number; // SNR of last heard message
  lastRxTime?: number; // Reception time of last message
  nodeBroadcastIntervalSecs?: number; // Broadcast interval of this neighbor
}

export interface NeighborInfo {
  nodeId: number; // The node ID of the node sending info on its neighbors
  lastSentById?: number; // Field to pass neighbor info for the next sending cycle
  nodeBroadcastIntervalSecs?: number; // Broadcast interval of the represented node
  neighbors?: Neighbor[]; // The list of out edges from this node
}

export interface MapReport {
  // This would need to be defined based on the actual data structure
  // Currently not defined in the proto files
  [key: string]: unknown;
}

export interface HardwareMessage {
  // Based on remote_hardware.proto but would need to be defined
  // Currently not detailed enough in the proto files to model completely
  type?: number;
  gpioMask?: number;
  gpioValue?: number;
}

// Routing error enum
export enum RoutingError {
  NONE = 0,
  NO_ROUTE = 1,
  GOT_NAK = 2,
  TIMEOUT = 3,
  NO_INTERFACE = 4,
  MAX_RETRANSMIT = 5,
  NO_CHANNEL = 6,
  TOO_LARGE = 7,
  NO_RESPONSE = 8,
  DUTY_CYCLE_LIMIT = 9,
  BAD_REQUEST = 32,
  NOT_AUTHORIZED = 33,
  PKI_FAILED = 34,
  PKI_UNKNOWN_PUBKEY = 35,
  ADMIN_BAD_SESSION_KEY = 36,
  ADMIN_PUBLIC_KEY_UNAUTHORIZED = 37,
}

export interface Routing {
  routeRequest?: RouteDiscovery; // A route request going from the requester
  routeReply?: RouteDiscovery; // A route reply
  errorReason?: RoutingError; // A failure in delivering a message
}

export interface AdminMessage {
  // This would need to be defined based on the admin.proto
  // Only include what's actually used in your application
  [key: string]: unknown;
}

export interface Paxcount {
  // This would need to be defined based on the paxcount.proto
  // Only include what's actually used in your application
  [key: string]: unknown;
}

// TopicInfo contains parsed information about a Meshtastic MQTT topic
export interface TopicInfo {
  fullTopic: string;
  regionPath: string;
  version: string;
  format: string;
  channel: string;
  userId: string;
}

// Data provides a flattened structure for decoded Meshtastic packets
export interface Data {
  // From Service Envelope
  channelId: string;
  gatewayId: string;

  // From Mesh Packet
  id: number;
  from: number;
  to: number;
  hopLimit: number;
  hopStart: number;
  wantAck: boolean;
  priority: string;
  viaMqtt: boolean;
  nextHop: number;
  relayNode: number;

  // From Data
  portNum: PortNum | string; // Can be either enum value or string name

  // Payload is one of these types, depending on portNum
  textMessage?: string;
  binaryData?: string; // Base64 encoded binary data
  position?: Position;
  nodeInfo?: User;
  telemetry?: Telemetry;
  waypoint?: Waypoint;
  routeDiscovery?: RouteDiscovery;
  neighborInfo?: NeighborInfo;
  compressedText?: string; // Base64 encoded
  mapReport?: MapReport;
  remoteHardware?: HardwareMessage;
  routing?: Routing;
  admin?: AdminMessage;
  audioData?: string; // Base64 encoded
  alert?: string;
  reply?: string;
  ipTunnel?: string; // Base64 encoded
  paxcounter?: Paxcount;
  serialApp?: string; // Base64 encoded
  storeForward?: string; // Base64 encoded
  rangeTest?: string;
  zpsApp?: string; // Base64 encoded
  simulator?: string; // Base64 encoded
  atakPlugin?: string; // Base64 encoded
  powerstress?: string; // Base64 encoded
  reticulumTunnel?: string; // Base64 encoded
  privateApp?: string; // Base64 encoded
  detectionSensor?: string;

  // Additional Data fields
  requestId?: number;
  replyId?: number;
  emoji?: number;
  dest?: number;
  source?: number;
  wantResponse?: boolean;

  // Error tracking
  decodeError?: string;

  // Reception timestamp (added by decoder)
  rxTime?: number;
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

export interface PaddingEvent {
  type: "padding";
  data: string; // Random data to trigger a flush.
}

export type StreamEvent =
  | InfoEvent
  | MessageEvent
  | PaddingEvent
  | BadDataEvent;

export type StreamEventHandler = (event: StreamEvent) => void;
