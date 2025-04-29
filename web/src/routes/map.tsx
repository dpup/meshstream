import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "../components";
import { NetworkMap } from "../components/dashboard";
import { Button } from "../components/ui";
import { Locate } from "lucide-react";

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
      <div className="max-w-6xl">
        <div>
          <NetworkMap 
            height="600px" 
            ref={mapRef as any}
            onAutoZoomChange={setAutoZoomEnabled}
          />
          
          <div className="mt-2 bg-neutral-800/50 rounded-lg p-2 text-xs flex items-center justify-between effect-inset">
            <div>
              <span className="inline-flex items-center mx-2 px-2 py-0.5 rounded text-green-500 bg-green-900/30">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                Nodes
              </span>
              <span className="inline-flex items-center mx-2 px-2 py-0.5 rounded text-amber-500 bg-amber-900/30">
                <span className="w-2 h-2 bg-amber-500 rounded-full mr-1.5"></span>
                Gateways
              </span>
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