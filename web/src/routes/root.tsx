import { Link, Outlet } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/root')({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Meshstream</h1>
            <nav className="space-x-4">
              <Link
                to="/home"
                className="hover:underline"
                activeProps={{
                  className: "font-bold underline",
                }}
              >
                Home
              </Link>
              <Link
                to="/stream"
                className="hover:underline"
                activeProps={{
                  className: "font-bold underline",
                }}
              >
                Packets
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
