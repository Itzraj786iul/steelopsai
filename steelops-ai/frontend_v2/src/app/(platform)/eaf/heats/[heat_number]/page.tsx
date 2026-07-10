"use client";

import { use } from "react";

import { HeatDetailsView } from "@/features/eaf/components/heat-details-view";

export default function HeatDetailsPage({ params }: { params: Promise<{ heat_number: string }> }) {
  const { heat_number } = use(params);
  return <HeatDetailsView heatNumber={decodeURIComponent(heat_number)} />;
}
