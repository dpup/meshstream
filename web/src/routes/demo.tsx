import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "../components";

export const Route = createFileRoute('/demo')({
  component: DemoPage,
});

function DemoPage() {
  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-4 text-neutral-200">Component Demo</h1>
      <p className="text-neutral-300 mb-4">
        This page demonstrates various UI components used in the application.
      </p>
    </PageWrapper>
  );
}