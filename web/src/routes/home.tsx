import { InfoMessage, Separator } from "../components";
import { SITE_TITLE } from "../lib/config";

export function IndexPage() {
  return (
    <div className="bg-neutral-700 rounded-lg shadow-inner">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-neutral-100">
          Welcome to {SITE_TITLE}
        </h2>
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

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </div>
  );
}