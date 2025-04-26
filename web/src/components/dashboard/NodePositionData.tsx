import React from "react";
import { KeyValuePair } from "../ui/KeyValuePair";

interface NodePositionDataProps {
  /** Latitude in decimal degrees */
  latitude: number;
  /** Longitude in decimal degrees */
  longitude: number;
  /** Altitude in meters (optional) */
  altitude?: number;
  /** Position accuracy in meters */
  positionAccuracy: number;
  /** Precision bits used for position accuracy calculation (optional) */
  precisionBits?: number;
  /** Number of satellites in view (optional) */
  satsInView?: number;
  /** Ground speed in m/s (optional) */
  groundSpeed?: number;
}

/**
 * Component to display node position metadata
 */
export const NodePositionData: React.FC<NodePositionDataProps> = ({
  latitude,
  longitude,
  altitude,
  positionAccuracy,
  precisionBits,
  satsInView,
  groundSpeed
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
      <KeyValuePair
        label="Coordinates"
        value={`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
        monospace={true}
        inset={true}
      />

      {altitude !== undefined && (
        <KeyValuePair
          label="Altitude"
          value={`${altitude} m`}
          monospace={true}
          inset={true}
        />
      )}

      <KeyValuePair
        label="Accuracy"
        value={
          positionAccuracy < 1000
            ? `±${positionAccuracy.toFixed(0)} m`
            : `±${(positionAccuracy / 1000).toFixed(1)} km`
        }
        monospace={true}
        inset={true}
      />

      {precisionBits !== undefined && (
        <KeyValuePair
          label="Precision"
          value={`${precisionBits} bits`}
          monospace={true}
          inset={true}
        />
      )}

      {satsInView !== undefined && (
        <KeyValuePair
          label="Satellites"
          value={satsInView}
          monospace={true}
          highlight={satsInView > 6}
          inset={true}
        />
      )}

      {groundSpeed !== undefined && (
        <KeyValuePair
          label="Speed"
          value={`${groundSpeed} m/s`}
          monospace={true}
          inset={true}
        />
      )}
    </div>
  );
};