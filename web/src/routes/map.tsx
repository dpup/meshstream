import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "../components";
import { NetworkMap } from "../components/dashboard";

export const Route = createFileRoute("/map")({
  component: MapPage,
});

function MapPage() {
  return (
    <PageWrapper>
      <div className="max-w-6xl">
        <div>
          <NetworkMap height="600px" />
          
          <div className="mt-2 bg-neutral-800/50 rounded-lg p-2 text-xs text-neutral-400 effect-inset">
            <span className="inline-flex items-center mx-2 px-2 py-0.5 rounded text-green-500 bg-green-900/30">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
              Nodes
            </span>
            <span className="inline-flex items-center mx-2 px-2 py-0.5 rounded text-amber-500 bg-amber-900/30">
              <span className="w-2 h-2 bg-amber-500 rounded-full mr-1.5"></span>
              Gateways
            </span>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}