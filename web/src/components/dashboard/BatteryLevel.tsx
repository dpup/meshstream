import React from "react";
import { BatteryFull, BatteryMedium, BatteryLow } from "lucide-react";

interface BatteryLevelProps {
  /** Battery level percentage (0-100) */
  level: number;
}

/**
 * Battery level component with visual indicator
 */
export const BatteryLevel: React.FC<BatteryLevelProps> = ({ level }) => {
  let color = "bg-green-500";
  let icon = <BatteryFull className="w-4 h-4" />;

  if (level <= 20) {
    color = "bg-red-500";
    icon = <BatteryLow className="w-4 h-4" />;
  } else if (level <= 50) {
    color = "bg-amber-500";
    icon = <BatteryMedium className="w-4 h-4" />;
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="text-neutral-400 flex items-center">
          {icon}
          <span className="ml-1.5">Battery</span>
        </span>
        <span
          className={`${level > 30 ? "text-green-500" : "text-amber-500"} font-mono text-sm`}
        >
          {level}%
        </span>
      </div>
      <div className="w-full bg-neutral-700/70 rounded-full h-2 effect-inset">
        <div
          className={`${color} h-2 rounded-full`}
          style={{ width: `${level}%` }}
        ></div>
      </div>
    </div>
  );
};