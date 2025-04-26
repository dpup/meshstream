import React from "react";
import { AlertTriangle, BatteryLow } from "lucide-react";

interface LowBatteryWarningProps {
  /** Battery level percentage (0-100) */
  batteryLevel: number;
}

/**
 * Warning component for low battery level
 */
export const LowBatteryWarning: React.FC<LowBatteryWarningProps> = ({ 
  batteryLevel 
}) => {
  if (batteryLevel >= 20) {
    return null;
  }
  
  return (
    <div className="bg-red-900/30 border border-red-800 p-4 rounded-lg effect-inset mt-4">
      <div className="flex items-center text-red-400">
        <AlertTriangle className="w-4 h-4 mr-2" />
        <h3 className="font-medium font-mono tracking-wider">
          LOW BATTERY WARNING
        </h3>
      </div>
      <p className="text-sm mt-2 text-neutral-300 flex items-center">
        <BatteryLow className="w-3 h-3 mr-1.5 text-red-400" />
        Battery level critically low at{" "}
        <span className="font-mono text-red-400 mx-1">
          {batteryLevel}%
        </span>
        Device may stop reporting soon.
      </p>
    </div>
  );
};