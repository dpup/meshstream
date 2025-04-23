import { InfoMessage, Separator, PageWrapper } from "../components";

export function IndexPage() {
  return (
    <PageWrapper>
      <div>
        <p className="mb-4 text-neutral-200">
          This application provides a real-time view of Meshtastic network
          traffic.
        </p>

        <InfoMessage
          message="Click on the Packets link in the navigation to view incoming messages from the Meshtastic network."
          type="info"
        />
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-neutral-800 border border-neutral-700 p-5 rounded shadow-inner">
          <h3 className="text-lg font-semibold mb-3 text-neutral-200">
            About Meshtastic
          </h3>
          <p className="text-neutral-300">
            Meshtastic is an open source, off-grid, decentralized mesh
            communication platform. It allows devices to communicate without
            cellular service or internet.
          </p>
        </div>

        <div className="bg-neutral-800 border border-neutral-700 p-5 rounded shadow-inner">
          <h3 className="text-lg font-semibold mb-3 text-neutral-200">
            Data Privacy
          </h3>
          <p className="text-neutral-300">
            All data is processed locally. Position data on public servers has
            reduced precision for privacy protection.
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}
