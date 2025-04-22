export function IndexPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Welcome to Meshstream</h2>
      <p className="mb-4">
        This application provides a real-time view of Meshtastic network traffic.
      </p>
      <div className="bg-blue-100 p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
        <p>
          Click on the <strong>Packets</strong> link in the navigation to view incoming
          messages from the Meshtastic network.
        </p>
      </div>
    </div>
  );
}
