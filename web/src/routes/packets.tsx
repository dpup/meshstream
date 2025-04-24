import { PacketList, PageWrapper } from "../components";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/packets")({
  component: PacketsPage,
});

function PacketsPage() {
  return (
    <PageWrapper>
      <PacketList />
    </PageWrapper>
  );
}
