import { PageWrapper, NodeDetail } from "../components";
import { createFileRoute } from "@tanstack/react-router";
import { useAppSelector } from "../hooks";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/node/$nodeId")({
  component: NodePage,
});

function NodePage() {
  // Get the node ID from the route params
  const { nodeId } = Route.useParams();
  
  // Convert nodeId hex string to number
  const nodeIdNum = parseInt(nodeId, 16);

  // State to track loading state with a delay
  const [isLoading, setIsLoading] = useState(true);
  
  // Check if we have data for this specific node and connection status
  const { nodes, gateways } = useAppSelector((state) => state.aggregator);
  
  // Check if the node exists in our dataset either as a node or as a gateway
  const gatewayId = `!${nodeIdNum.toString(16).toLowerCase()}`;
  const gateway = gateways[gatewayId];
  const nodeExists = !!nodes[nodeIdNum] || !!gateway;
  
  useEffect(() => {
    // If we already have the node data, immediately show it
    if (nodeExists) {
      setIsLoading(false);
      return;
    }
    
    // For client-side navigations, don't show a loading state
    if (document.readyState === 'complete') {
      // The page is fully loaded
      setIsLoading(false);
      return;
    }
    
    // If no node data but the page is being freshly loaded, add a short delay to let packets stream in.
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [nodeExists]);

  return (
    <PageWrapper>
      {isLoading ? (
        <div className="p-6 flex items-center justify-center">
          <div className="animate-pulse text-neutral-400">
            Loading data...
          </div>
        </div>
      ) : (
        <NodeDetail nodeId={nodeIdNum} />
      )}
    </PageWrapper>
  );
}