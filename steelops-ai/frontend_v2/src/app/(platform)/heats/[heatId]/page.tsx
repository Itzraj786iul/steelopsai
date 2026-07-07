import { redirect } from "next/navigation";

export default async function LegacyHeatRedirectPage({ params }: { params: Promise<{ heatId: string }> }) {
  const { heatId } = await params;
  redirect(`/heat/${heatId}`);
}
    