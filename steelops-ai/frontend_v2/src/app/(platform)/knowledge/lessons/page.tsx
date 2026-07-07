import { DashboardLayout } from "@/components/layout/page-header";
import { PlantIntelligenceTimeline } from "@/features/mission/components/plant-intelligence-timeline";

export default function Page() {
  return (
    <DashboardLayout>
      <header className="mb-8">
        <p className="text-label">Learning</p>
        <h1 className="text-display-md">Plant intelligence</h1>
        <p className="mt-2 text-muted-foreground">What worked, what failed, and how confidence evolves.</p>
      </header>
      <PlantIntelligenceTimeline />
    </DashboardLayout>
  );
}
