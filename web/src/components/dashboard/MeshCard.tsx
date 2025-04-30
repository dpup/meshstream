import React from "react";
import { Radio, Signal, Battery, MapPin, Thermometer } from "lucide-react";
import { Counter } from "../Counter";
import { NodeData } from "../../store/slices/aggregatorSlice";
import { getActivityLevel, getNodeColors, ActivityLevel } from "../../lib/activity";

export interface MeshCardProps {
  type: "node" | "gateway";
  nodeId: number;
  nodeData: NodeData;
  observedNodes?: number[];
  onClick?: (nodeId: number) => void;
  lastHeard: number;
}

export const MeshCard: React.FC<MeshCardProps> = ({
  type,
  nodeId,
  nodeData,
  observedNodes = [],
  onClick,
  lastHeard,
}) => {
  // Format last heard time
  const lastHeardDate = new Date(lastHeard * 1000);
  const timeString = lastHeardDate.toLocaleTimeString();

  // Handle click event
  const handleClick = () => {
    if (onClick) {
      onClick(nodeId);
    }
  };

  // Get icon based on type
  const getIcon = () => {
    return type === "gateway" ? (
      <Signal className="w-4 h-4" />
    ) : (
      <Radio className="w-4 h-4" />
    );
  };

  // Use activity helpers to get styles
  const activityLevel = getActivityLevel(lastHeard, type === "gateway");
  const colors = getNodeColors(activityLevel, type === "gateway");
  
  // Get card style based on activity
  const getCardStyle = () => {
    if (activityLevel === ActivityLevel.RECENT) {
      return "bg-neutral-800 hover:bg-neutral-700";
    } else if (activityLevel === ActivityLevel.ACTIVE) {
      return "bg-neutral-800/80 hover:bg-neutral-700/80";
    } else {
      return "bg-neutral-800/50 hover:bg-neutral-800";
    }
  };

  // Get icon style based on activity
  const getIconStyle = () => {
    return colors.background + " " + colors.textClass;
  };

  // Get status dot color
  const getStatusDotStyle = () => {
    return colors.statusDot;
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center p-2 rounded-lg ${getCardStyle()} ${onClick ? "cursor-pointer transition-colors" : ""}`}
    >
      <div className="mr-2">
        <div className={`p-1.5 rounded-full ${getIconStyle()}`}>
          {getIcon()}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-neutral-200 truncate flex items-center gap-1">
          {nodeData.shortName || nodeData.longName ? (
            <>
              <span>{nodeData.shortName || nodeData.longName}</span>
              <span className="text-neutral-500 text-xs">
                !{nodeId.toString(16).slice(-4)}
              </span>
            </>
          ) : (
            <span>!{nodeId.toString(16)}</span>
          )}
          {nodeData.position && (
            <MapPin className="w-3 h-3 text-blue-400 ml-1" />
          )}
          {nodeData.environmentMetrics &&
            Object.keys(nodeData.environmentMetrics).length > 0 && (
              <Thermometer className="w-3 h-3 text-amber-400 ml-1" />
            )}
        </div>
        <div className="text-xs text-neutral-400 flex items-center">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${getStatusDotStyle()}`}
          ></span>
          {timeString}
        </div>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap flex-shrink-0">
        {nodeData.batteryLevel !== undefined && (
          <div className="flex items-center text-xs">
            <Battery className="w-3.5 h-3.5 mr-0.5" />
            <span
              className={
                nodeData.batteryLevel > 30 ? "text-green-500" : "text-amber-500"
              }
            >
              {nodeData.batteryLevel}%
            </span>
          </div>
        )}

        {/* Only show observed nodes count for gateways */}
        {type === "gateway" && observedNodes && observedNodes.length > 0 && (
          <Counter
            value={observedNodes.length}
            label="nodes"
            valueColor="text-sky-500"
            className="mr-1"
          />
        )}

        <Counter
          value={nodeData.textMessageCount}
          label="txt"
          valueColor="text-teal-500"
          className="mr-1"
        />
        <Counter
          value={nodeData.messageCount}
          label="pkts"
          valueColor="text-amber-500"
        />
      </div>
    </div>
  );
};
