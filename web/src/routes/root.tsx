import { Link, Outlet } from '@tanstack/react-router';

export function Root() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Meshstream</h1>
            <nav className="space-x-4">
              <Link
                to="/"
                className="hover:underline"
                activeProps={{
                  className: 'font-bold underline',
                }}
              >
                Home
              </Link>
              <Link
                to="/packets"
                className="hover:underline"
                activeProps={{
                  className: 'font-bold underline',
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
