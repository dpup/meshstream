/**
 * Activity status and color utilities for Meshtastic nodes
 */

// Different activity levels
export enum ActivityLevel {
  RECENT = 'recent',   // Very recently seen
  ACTIVE = 'active',   // Active but not super recent
  INACTIVE = 'inactive' // Not active for a while
}

// Node types
export enum NodeType {
  NODE = 'node',
  GATEWAY = 'gateway',
  ROUTER = 'router'
}

// Allow different time thresholds for different node types in seconds
export const TIME_THRESHOLDS = {
  [NodeType.NODE]: {
    recent: 600,   // 10 minutes
    active: 3600,  // 60 minutes
  },
  [NodeType.GATEWAY]: {
    recent: 600,   // 10 minutes
    active: 1800,   // 30 minutes
  },
  [NodeType.ROUTER]: {
    recent: 600,   // 10 minutes
    active: 43200,  // 12 hours
  },
};

// Color schemes for different node types
export const COLORS = {
  [NodeType.GATEWAY]: {
    [ActivityLevel.RECENT]: { 
      fill: "#4ade80", 
      stroke: "#22c55e",
      text: "#4ade80",
      background: "bg-green-900/30",
      textClass: "text-green-500",
      bgClass: "bg-green-500",
      statusDot: "bg-green-500"
    },
    [ActivityLevel.ACTIVE]: { 
      fill: "#16a34a", 
      stroke: "#15803d",
      text: "#16a34a",
      background: "bg-green-900/50",
      textClass: "text-green-700",
      bgClass: "bg-green-700",
      statusDot: "bg-green-700"
    },
    [ActivityLevel.INACTIVE]: { 
      fill: "#9ca3af", 
      stroke: "#6b7280",
      text: "#6b7280",
      background: "bg-neutral-700/30",
      textClass: "text-neutral-500",
      bgClass: "bg-neutral-500",
      statusDot: "bg-neutral-500"
    },
  },
  [NodeType.NODE]: {
    [ActivityLevel.RECENT]: {
      "fill": "#93c5fd",
      "stroke": "#60a5fa",
      "text": "#93c5fd",
      "background": "bg-blue-900/30",
      "textClass": "text-blue-500",
      "bgClass": "bg-blue-500",
      "statusDot": "bg-blue-500"
    },
    [ActivityLevel.ACTIVE]: {
      "fill": "#3b82f6",
      "stroke": "#2563eb",
      "text": "#3b82f6",
      "background": "bg-blue-900/50",
      "textClass": "text-blue-700",
      "bgClass": "bg-blue-700",
      "statusDot": "bg-blue-700"
    },
    [ActivityLevel.INACTIVE]: {
      "fill": "#9ca3af",
      "stroke": "#6b7280",
      "text": "#6b7280",
      "background": "bg-neutral-700/30",
      "textClass": "text-neutral-500",
      "bgClass": "bg-neutral-500",
      "statusDot": "bg-neutral-500"
    }
  },
  [NodeType.ROUTER]: {
    [ActivityLevel.RECENT]: {
      "fill": "#fbbf24",
      "stroke": "#f59e0b",
      "text": "#fbbf24",
      "background": "bg-yellow-900/30",
      "textClass": "text-yellow-500",
      "bgClass": "bg-yellow-500",
      "statusDot": "bg-yellow-500"
    },
    [ActivityLevel.ACTIVE]: {
      "fill": "#f59e0b",
      "stroke": "#d97706",
      "text": "#f59e0b",
      "background": "bg-yellow-900/50",
      "textClass": "text-yellow-700",
      "bgClass": "bg-yellow-700",
      "statusDot": "bg-yellow-700"
    },
    [ActivityLevel.INACTIVE]: {
      "fill": "#9ca3af",
      "stroke": "#6b7280",
      "text": "#6b7280",
      "background": "bg-neutral-700/30",
      "textClass": "text-neutral-500",
      "bgClass": "bg-neutral-500",
      "statusDot": "bg-neutral-500"
    }
  },
};

// Status text for different activity levels
export const STATUS_TEXT = {
  [ActivityLevel.RECENT]: 'Active',
  [ActivityLevel.ACTIVE]: 'Recent',
  [ActivityLevel.INACTIVE]: 'Inactive',
};

/**
 * Determines the activity level of a node based on its last heard time
 *
 * @param lastHeardTimestamp UNIX timestamp in seconds
 * @param isGateway Whether the node is a gateway
 * @param isRouter Whether the node is a router
 * @returns The activity level (RECENT, ACTIVE, or INACTIVE)
 */
export function getActivityLevel(lastHeardTimestamp?: number, isGateway = false, isRouter = false): ActivityLevel {
  if (!lastHeardTimestamp) return ActivityLevel.INACTIVE;

  const nodeType = isGateway ? NodeType.GATEWAY : (isRouter ? NodeType.ROUTER : NodeType.NODE);
  const secondsSince = Math.floor(Date.now() / 1000) - lastHeardTimestamp;

  if (secondsSince < TIME_THRESHOLDS[nodeType].recent) {
    return ActivityLevel.RECENT;
  } else if (secondsSince < TIME_THRESHOLDS[nodeType].active) {
    return ActivityLevel.ACTIVE;
  } else {
    return ActivityLevel.INACTIVE;
  }
}

/**
 * Returns the color scheme for a node based on its activity level
 *
 * @param activityLevel The activity level
 * @param isGateway Whether the node is a gateway
 * @param isRouter Whether the node is a router
 * @returns Color scheme object
 */
export function getNodeColors(activityLevel: ActivityLevel, isGateway = false, isRouter = false): typeof COLORS[NodeType.NODE][ActivityLevel.RECENT] {
  const nodeType = isGateway ? NodeType.GATEWAY : (isRouter ? NodeType.ROUTER : NodeType.NODE);
  return COLORS[nodeType][activityLevel];
}

/**
 * Returns the status text for an activity level
 * 
 * @param activityLevel The activity level
 * @returns Status text
 */
export function getStatusText(activityLevel: ActivityLevel): string {
  return STATUS_TEXT[activityLevel];
}

/**
 * Formats a "last seen" time difference in a human-readable format
 * 
 * @param secondsAgo Number of seconds since the event
 * @returns Human-readable time string (e.g., "2 minutes ago")
 */
export function formatLastSeen(secondsAgo: number): string {
  if (secondsAgo < 60) {
    return `${secondsAgo} seconds ago`;
  } else if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (secondsAgo < 86400) {
    const hours = Math.floor(secondsAgo / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(secondsAgo / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

/**
 * Gets style classes based on the activity level
 *
 * @param lastHeardTimestamp UNIX timestamp in seconds
 * @param isGateway Whether the node is a gateway
 * @param isRouter Whether the node is a router
 * @returns Object with color classes for various UI elements
 */
export function getActivityStyles(lastHeardTimestamp?: number, isGateway = false, isRouter = false) {
  const activityLevel = getActivityLevel(lastHeardTimestamp, isGateway, isRouter);
  const colors = getNodeColors(activityLevel, isGateway, isRouter);
  const statusText = getStatusText(activityLevel);

  return {
    activityLevel,
    statusText,
    ...colors
  };
}