import React from "react";
import { Packet } from "../lib/types";

interface MessageDisplayProps {
  message: Packet;
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({ message }) => {
  const { data } = message;

  const getMessageContent = () => {
    if (data.text_message) {
      return data.text_message;
    } else if (data.position) {
      return `Position: ${data.position.latitude}, ${data.position.longitude}`;
    } else if (data.node_info) {
      return `Node Info: ${data.node_info.longName || data.node_info.shortName}`;
    } else if (data.telemetry) {
      return "Telemetry data";
    } else if (data.decode_error) {
      return `Error: ${data.decode_error}`;
    }
    return "Unknown message type";
  };

  return (
    <div className="p-4 border border-neutral-700 rounded bg-neutral-800 shadow-inner">
      <div className="flex justify-between mb-2">
        <span className="font-medium text-neutral-200">
          From: {data.from || "Unknown"}
        </span>
        <span className="text-neutral-400 text-sm">
          ID: {data.id || "No ID"}
        </span>
      </div>
      <div className="mb-2 text-neutral-300">{getMessageContent()}</div>
      <div className="mt-3 flex justify-between items-center">
        <span className="text-xs text-neutral-500">
          Channel: {message.info.channel}
        </span>
        <span className="text-xs text-neutral-500">Type: {data.port_num}</span>
      </div>
    </div>
  );
};
