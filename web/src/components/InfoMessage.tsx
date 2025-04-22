import React from "react";
import { Info, AlertTriangle, AlertCircle } from "lucide-react";

interface InfoMessageProps {
  message: string;
  type?: "info" | "warning" | "error";
}

export const InfoMessage: React.FC<InfoMessageProps> = ({
  message,
  type = "info",
}) => {
  const getBgColor = () => {
    switch (type) {
      case "warning":
        return "bg-neutral-700 border-neutral-600";
      case "error":
        return "bg-neutral-800 border-neutral-700";
      case "info":
      default:
        return "bg-neutral-800 border-neutral-700";
    }
  };

  const getTextColor = () => {
    switch (type) {
      case "warning":
        return "text-amber-400";
      case "error":
        return "text-red-400";
      case "info":
      default:
        return "text-neutral-300";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case "info":
      default:
        return <Info className="h-5 w-5 text-neutral-400" />;
    }
  };

  return (
    <div className={`p-3 mb-4 rounded border ${getBgColor()} shadow-inner`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5 mr-3">{getIcon()}</div>
        <p className={`text-sm ${getTextColor()}`}>{message}</p>
      </div>
    </div>
  );
};
