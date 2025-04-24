import { PageWrapper, NodeList, GatewayList } from "../components";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/home')({
  component: HomePage,
});

function HomePage() {
  return (
    <PageWrapper>
      <div className="mb-4">
        <h1 className="text-xl font-bold mb-2 text-neutral-200">Network Dashboard</h1>
        <p className="text-sm text-neutral-400">
          Real-time view of your Meshtastic mesh network traffic
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
          <GatewayList />
        </div>
        
        <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
          <NodeList />
        </div>
      </div>
    </PageWrapper>
  );
}
