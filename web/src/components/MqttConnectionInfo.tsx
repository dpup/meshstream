import React from "react";
import { useAppSelector } from "../hooks";

/**
 * Component that displays MQTT connection details
 */
export const MqttConnectionInfo: React.FC = () => {
  const connectionInfo = useAppSelector(state => state.connection.info);

  if (!connectionInfo) {
    return (
      <div className="text-neutral-400 italic mb-4">
        Waiting for connection information...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {connectionInfo.mqttServer && (
        <div>
          <h3 className="text-sm font-semibold text-neutral-200 mb-1">MQTT Server</h3>
          <div className="bg-neutral-900/50 p-2 rounded font-mono text-xs text-neutral-300 overflow-auto">
            {connectionInfo.mqttServer}
          </div>
        </div>
      )}
      
      {connectionInfo.mqttTopic && (
        <div>
          <h3 className="text-sm font-semibold text-neutral-200 mb-1">MQTT Topic</h3>
          <div className="bg-neutral-900/50 p-2 rounded font-mono text-xs text-neutral-300 break-all">
            {connectionInfo.mqttTopic}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-neutral-200 mb-1">Connection Status</h3>
        <div className={`flex items-center ${connectionInfo.connected ? 'text-green-500' : 'text-red-500'}`}>
          <div className={`h-2 w-2 rounded-full mr-2 ${connectionInfo.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{connectionInfo.connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  );
};