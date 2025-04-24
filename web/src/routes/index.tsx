import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // Redirect to the home page
    throw redirect({ to: '/home' });
  },
});