import { PageWrapper, NodeDetail } from "../components";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/node/$nodeId")({
  component: NodePage,
});

function NodePage() {
  // Get the node ID from the route params
  const { nodeId } = Route.useParams();
  
  // Convert nodeId hex string to number
  const nodeIdNum = parseInt(nodeId, 16);

  return (
    <PageWrapper>
      <NodeDetail nodeId={nodeIdNum} />
    </PageWrapper>
  );
}