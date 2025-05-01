import React from "react";
import { Packet, EnvironmentMetrics } from "../../lib/types";
import { Thermometer, Droplets, Wind, Sun, Ruler, Clock } from "lucide-react";
import { PacketCard } from "./PacketCard";

interface EnvironmentMetricsPacketProps {
  packet: Packet;
  metrics: EnvironmentMetrics;
  timestamp?: number;
}

export const EnvironmentMetricsPacket: React.FC<
  EnvironmentMetricsPacketProps
> = ({ packet, metrics, timestamp }) => {
  // Format time without seconds
  const formattedTime = timestamp
    ? new Date(timestamp * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // Get appropriate icon for a metric
  const getMetricIcon = (metricName: string) => {
    switch (metricName) {
      case "temperature":
      case "soilTemperature":
        return <Thermometer className="h-3 w-3 text-neutral-500" />;
      case "relativeHumidity":
      case "soilMoisture":
      case "rainfall1h":
      case "rainfall24h":
        return <Droplets className="h-3 w-3 text-neutral-500" />;
      case "windSpeed":
      case "windDirection":
      case "windGust":
      case "windLull":
        return <Wind className="h-3 w-3 text-neutral-500" />;
      case "lux":
      case "whiteLux":
      case "irLux":
      case "uvLux":
        return <Sun className="h-3 w-3 text-neutral-500" />;
      case "distance":
        return <Ruler className="h-3 w-3 text-neutral-500" />;
      default:
        return null;
    }
  };

  // Format metric value with appropriate unit
  const formatMetricValue = (name: string, value: number): string => {
    switch (name) {
      case "temperature":
      case "soilTemperature":
        return `${value.toFixed(1)}°C`;
      case "relativeHumidity":
      case "soilMoisture":
        return `${value.toFixed(1)}%`;
      case "barometricPressure":
        return `${(value / 100).toFixed(1)} hPa`;
      case "lux":
      case "whiteLux":
      case "irLux":
      case "uvLux":
        return `${value.toFixed(0)} lux`;
      case "windSpeed":
      case "windGust":
      case "windLull":
        return `${value.toFixed(1)} m/s`;
      case "windDirection":
        return `${value.toFixed(0)}°`;
      case "rainfall1h":
      case "rainfall24h":
        return `${value.toFixed(1)} mm`;
      case "distance":
        return `${value.toFixed(0)} mm`;
      case "radiation":
        return `${value.toFixed(1)} µR/h`;
      case "weight":
        return `${value.toFixed(2)} kg`;
      default:
        return `${value}`;
    }
  };

  // Create metrics grid items from available metrics
  const renderMetrics = () => {
    const entries = Object.entries(metrics).filter(
      ([key]) => key !== "time" && key !== "voltage" && key !== "current"
    );

    return entries.map(([key, value]) => {
      if (value === undefined) return null;

      // Format the name for display
      const displayName = key
        .replace(/([A-Z])/g, " $1")
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      return (
        <div key={key}>
          <div className="flex items-center gap-1.5">
            {getMetricIcon(key)}
            <span className="text-xs text-neutral-400">{displayName}</span>
          </div>
          <div className="text-sm">
            {formatMetricValue(key, value as number)}
          </div>
        </div>
      );
    });
  };

  return (
    <PacketCard
      packet={packet}
      icon={<Thermometer />}
      iconBgColor="bg-emerald-700"
      label="Environment Telemetry"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {renderMetrics()}

          {formattedTime && (
            <div className="">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-neutral-500" />
                <span className="text-xs text-neutral-400">Reported</span>
              </div>
              <div className="text-sm">{formattedTime}</div>
            </div>
          )}
        </div>
      </div>
    </PacketCard>
  );
};
