import { LiveHeatWorkspace } from "@/features/live/components/live-heat-workspace";

export default async function LiveHeatPage({ params }: { params: Promise<{ heatId: string }> }) {
  const { heatId } = await params;
  return <LiveHeatWorkspace heatId={heatId} />;
}
