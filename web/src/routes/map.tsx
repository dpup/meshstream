import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "../components";
import { NetworkMap } from "../components/dashboard";
import { Button } from "../components/ui";
import { Locate, GitBranch } from "lucide-react";
import { getNodeColors, ActivityLevel } from "../lib/activity";

export const Route = createFileRoute("/map")({
  component: MapPage,
});

function MapPage() {
  // State to track if auto-zoom is enabled (forwarded from the NetworkMap component)
  const [autoZoomEnabled, setAutoZoomEnabled] = React.useState(true);
  const [showLinks, setShowLinks] = React.useState(true);
  const mapRef = React.useRef<{ resetAutoZoom?: () => void }>({});

  // Function to reset auto-zoom, will be called by the button
  const handleResetZoom = () => {
    if (mapRef.current.resetAutoZoom) {
      mapRef.current.resetAutoZoom();
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)]">
        <div className="flex-1 flex flex-col min-h-0">
          <NetworkMap
            fullHeight
            ref={mapRef as any}
            onAutoZoomChange={setAutoZoomEnabled}
            showLinks={showLinks}
          />

          <div className="mt-2 rounded-lg p-2 text-xs flex items-center justify-between effect-inset flex-shrink-0">
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded ${getNodeColors(ActivityLevel.RECENT, false).textClass} ${getNodeColors(ActivityLevel.RECENT, false).background}`}>
                  <span className={`w-2 h-2 ${getNodeColors(ActivityLevel.RECENT, false).statusDot} rounded-full mr-1.5`}></span>
                  Nodes
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded ${getNodeColors(ActivityLevel.RECENT, true).textClass} ${getNodeColors(ActivityLevel.RECENT, true).background}`}>
                  <span className={`w-2 h-2 ${getNodeColors(ActivityLevel.RECENT, true).statusDot} rounded-full mr-1.5`}></span>
                  Gateways
                </span>
                <span className="text-neutral-500">·</span>
                <span className="inline-flex items-center gap-1.5 text-neutral-300">
                  <span className="inline-block w-5 h-0.5 rounded-full bg-[#22c55e]"></span>SNR ≥ 5
                </span>
                <span className="inline-flex items-center gap-1.5 text-neutral-300">
                  <span className="inline-block w-5 h-0.5 rounded-full bg-[#eab308]"></span>SNR 0–4
                </span>
                <span className="inline-flex items-center gap-1.5 text-neutral-300">
                  <span className="inline-block w-5 h-0.5 rounded-full bg-[#ef4444]"></span>SNR &lt; 0
                </span>
                <span className="inline-flex items-center gap-1.5 text-neutral-300">
                  <span className="inline-block w-5 h-0.5 rounded-full bg-[#6b7280]"></span>Unknown
                </span>
                <span className="inline-flex items-center gap-1.5 text-neutral-300">
                  <span className="inline-block w-5 border-t-2 border-dashed border-[#f97316] opacity-80"></span>MQTT
                </span>
              </div>
              
             
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={showLinks ? "primary" : "secondary"}
                onClick={() => setShowLinks((v) => !v)}
                icon={GitBranch}
                title={showLinks ? "Hide link polylines" : "Show link polylines"}
              >
                Links
              </Button>
              {/* Always show the button, but disable it when auto-zoom is enabled */}
              <Button
                size="sm"
                variant="secondary"
                onClick={handleResetZoom}
                icon={Locate}
                disabled={autoZoomEnabled}
                title={autoZoomEnabled ? "Auto-zoom is already enabled" : "Enable auto-zoom to fit all nodes"}
              >
                Auto-zoom
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}