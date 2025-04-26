import React from "react";
import { Thermometer, Droplets, Gauge } from "lucide-react";
import { KeyValuePair } from "../ui/KeyValuePair";

interface EnvironmentMetricsProps {
  /** Temperature in Celsius (optional) */
  temperature?: number;
  /** Relative humidity percentage (optional) */
  relativeHumidity?: number;
  /** Barometric pressure in hPa (optional) */
  barometricPressure?: number;
  /** Soil moisture percentage (optional) */
  soilMoisture?: number;
}

/**
 * Component to display environmental metrics
 */
export const EnvironmentMetrics: React.FC<EnvironmentMetricsProps> = ({
  temperature,
  relativeHumidity,
  barometricPressure,
  soilMoisture
}) => {
  return (
    <div className="space-y-4">
      {temperature !== undefined && (
        <div className="flex flex-col">
          <div className="flex justify-between mb-1 bg-neutral-700/50 p-2 rounded effect-inset">
            <span className="text-neutral-400 flex items-center">
              <Thermometer className="w-3 h-3 mr-2" />
              Temperature
            </span>
            <span
              className={`
                ${
                  temperature > 30
                    ? "text-red-500"
                    : temperature < 10
                      ? "text-blue-500"
                      : "text-green-500"
                } font-mono text-sm
              `}
            >
              {temperature}°C
            </span>
          </div>
          <div className="w-full bg-neutral-700/70 rounded-full h-2 effect-inset mt-1">
            {/* Temp scale: -10°C to 40°C mapped to 0-100% */}
            <div
              className={`
                ${
                  temperature > 30
                    ? "bg-red-500"
                    : temperature < 10
                      ? "bg-blue-500"
                      : "bg-green-500"
                } h-2 rounded-full
              `}
              style={{
                width: `${Math.max(0, Math.min(100, ((temperature + 10) / 50) * 100))}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {relativeHumidity !== undefined && (
        <div className="flex flex-col mt-3">
          <div className="flex justify-between mb-1 bg-neutral-700/50 p-2 rounded effect-inset">
            <span className="text-neutral-400 flex items-center">
              <Droplets className="w-3 h-3 mr-2" />
              Humidity
            </span>
            <span className="text-blue-400 font-mono text-sm">
              {relativeHumidity}%
            </span>
          </div>
          <div className="w-full bg-neutral-700/70 rounded-full h-2 effect-inset mt-1">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{
                width: `${relativeHumidity}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {barometricPressure !== undefined && (
        <KeyValuePair
          label="Pressure"
          value={`${barometricPressure} hPa`}
          icon={<Gauge className="w-3 h-3" />}
          monospace={true}
          inset={true}
        />
      )}

      {soilMoisture !== undefined && (
        <div className="flex flex-col mt-3">
          <div className="flex justify-between mb-1 bg-neutral-700/50 p-2 rounded effect-inset">
            <span className="text-neutral-400 flex items-center">
              <Droplets className="w-3 h-3 mr-2" />
              Soil Moisture
            </span>
            <span className="text-green-400 font-mono text-sm">
              {soilMoisture}%
            </span>
          </div>
          <div className="w-full bg-neutral-700/70 rounded-full h-2 effect-inset mt-1">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{
                width: `${soilMoisture}%`,
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};