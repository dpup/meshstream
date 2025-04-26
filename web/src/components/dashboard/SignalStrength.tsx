import React from "react";
import { Signal } from "lucide-react";

interface SignalStrengthProps {
  /** Signal-to-noise ratio (SNR) in dB */
  snr: number;
}

/**
 * Signal strength component with visual indicator
 * SNR is typically in dB, with values from -20 to +20
 * Higher is better: < 0 is poor, > 10 is excellent
 */
export const SignalStrength: React.FC<SignalStrengthProps> = ({ snr }) => {
  let strengthClass = "bg-red-500";
  let strengthText = "Poor";
  let textColor = "text-red-500";

  if (snr > 10) {
    strengthClass = "bg-green-500";
    strengthText = "Excellent";
    textColor = "text-green-500";
  } else if (snr > 5) {
    strengthClass = "bg-green-400";
    strengthText = "Good";
    textColor = "text-green-400";
  } else if (snr > 0) {
    strengthClass = "bg-amber-500";
    strengthText = "Fair";
    textColor = "text-amber-500";
  }

  // Calculate width percentage (0-100%)
  // Map SNR from -20...+20 to 0...100%
  const percentage = Math.max(0, Math.min(100, ((snr + 20) / 40) * 100));

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="text-neutral-400 flex items-center">
          <Signal className="w-4 h-4" />
          <span className="ml-1.5">Signal</span>
        </span>
        <span className="flex items-center">
          <span className="font-mono text-sm">{snr} dB</span>
          <span className={`${textColor} text-xs ml-1.5`}>
            ({strengthText})
          </span>
        </span>
      </div>
      <div className="w-full bg-neutral-700/70 rounded-full h-2 effect-inset">
        <div
          className={`${strengthClass} h-2 rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};