import React from "react";
import { WifiOff, Wifi, WifiLow, Activity, AlertCircle } from "lucide-react";

interface ConnectionStatusProps {
  status: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
}) => {
  // Determine connection status type
  const getStatusInfo = () => {
    if (status.includes("error") || status.includes("Error")) {
      return {
        icon: <AlertCircle className="h-5 w-5 text-red-400" />,
        text: "Connection Error",
        colorClass: "text-red-400",
      };
    } else if (status.includes("Reconnecting")) {
      return {
        icon: <WifiLow className="h-5 w-5 text-amber-400" />,
        text: "Reconnecting",
        colorClass: "text-amber-400",
      };
    } else if (status.includes("Connecting")) {
      return {
        icon: <Activity className="h-5 w-5 text-blue-400" />,
        text: "Connecting",
        colorClass: "text-blue-400",
      };
    } else if (status.includes("Connected")) {
      return {
        icon: <Wifi className="h-5 w-5 text-green-400" />,
        text: "Connected",
        colorClass: "text-green-400",
      };
    } else {
      // Default state or unknown status
      return {
        icon: <WifiOff className="h-5 w-5 text-neutral-400" />,
        text: status || "Unknown",
        colorClass: "text-neutral-400",
      };
    }
  };

  const { icon, text, colorClass } = getStatusInfo();

  return (
    <div className="flex items-center space-x-2 bg-neutral-800 p-4 border-1 border-b-neutral-700 border-r-neutral-700 border-t-neutral-950 border-l-neutral-950 rounded-sm">
      {icon}
      <span className={`text-sm font-medium ${colorClass}`}>{text}</span>
    </div>
  );
};
