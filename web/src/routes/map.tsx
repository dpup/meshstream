import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "../components";
import { NetworkMap } from "../components/dashboard";
import { Button } from "../components/ui";
import { Locate } from "lucide-react";
import { getNodeColors, ActivityLevel } from "../lib/activity";

export const Route = createFileRoute("/map")({
  component: MapPage,
});

function MapPage() {
  // State to track if auto-zoom is enabled (forwarded from the NetworkMap component)
  const [autoZoomEnabled, setAutoZoomEnabled] = React.useState(true);
  const mapRef = React.useRef<{ resetAutoZoom?: () => void }>({});

  // Function to reset auto-zoom, will be called by the button
  const handleResetZoom = () => {
    if (mapRef.current.resetAutoZoom) {
      mapRef.current.resetAutoZoom();
    }
  };

  return (
    <PageWrapper>
      <div>
        <div>
          <NetworkMap 
            height="600px" 
            ref={mapRef as any}
            onAutoZoomChange={setAutoZoomEnabled}
          />
          
          <div className="mt-2 bg-neutral-800/50 rounded-lg p-2 text-xs flex items-center justify-between effect-inset">
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded ${getNodeColors(ActivityLevel.RECENT, false).textClass} ${getNodeColors(ActivityLevel.RECENT, false).background}`}>
                  <span className={`w-2 h-2 ${getNodeColors(ActivityLevel.RECENT, false).statusDot} rounded-full mr-1.5`}></span>
                  Nodes
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded ${getNodeColors(ActivityLevel.RECENT, true).textClass} ${getNodeColors(ActivityLevel.RECENT, true).background}`}>
                  <span className={`w-2 h-2 ${getNodeColors(ActivityLevel.RECENT, true).statusDot} rounded-full mr-1.5`}></span>
                  Gateways
                </span>
              </div>
              
             
            </div>
            
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
    </PageWrapper>
  );
}