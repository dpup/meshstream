import React from "react";
import { BarChart } from "lucide-react";

interface UtilizationMetricsProps {
  /** Channel utilization percentage (optional) */
  channelUtilization?: number;
  /** Air utilization for transmission percentage (optional) */
  airUtilTx?: number;
}

/**
 * Component to display channel utilization metrics
 */
export const UtilizationMetrics: React.FC<UtilizationMetricsProps> = ({
  channelUtilization,
  airUtilTx
}) => {
  if (channelUtilization === undefined && airUtilTx === undefined) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-neutral-700">
      <div className="text-sm text-neutral-400 mb-2 flex items-center">
        <BarChart className="w-3 h-3 mr-1.5" />
        Channel Utilization:
      </div>

      {channelUtilization !== undefined && (
        <div className="flex flex-col mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span>Total</span>
            <span className="font-mono">
              {channelUtilization}%
            </span>
          </div>
          <div className="w-full bg-neutral-700/70 rounded-full h-2 effect-inset">
            <div
              className={`bg-blue-500 h-2 rounded-full`}
              style={{
                width: `${channelUtilization}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {airUtilTx !== undefined && (
        <div className="flex flex-col">
          <div className="flex justify-between text-xs mb-1">
            <span>Transmit</span>
            <span className="font-mono">
              {airUtilTx}%
            </span>
          </div>
          <div className="w-full bg-neutral-700/70 rounded-full h-2 effect-inset">
            <div
              className={`bg-green-500 h-2 rounded-full`}
              style={{
                width: `${airUtilTx}%`,
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};