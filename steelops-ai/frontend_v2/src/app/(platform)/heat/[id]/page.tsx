import { HeatDetailView } from "@/features/preheat/components/heat-detail-view";

export default async function HeatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HeatDetailView heatId={id} />;
}
