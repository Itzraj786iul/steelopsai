import { SettingsSection } from "@/features/onboarding/components/settings-section";

export default function Page() {
  return (
    <SettingsSection title="Licenses" description="Enterprise pilot · 3 furnaces · through Dec 2026">
      <div className="space-y-2 text-sm">
        <p><strong>Plan:</strong> SteelOps AI Enterprise Pilot</p>
        <p><strong>Entitlements:</strong> Mission workspace, Digital twin, Executive command center, Agents</p>
        <p><strong>Seats:</strong> 50 users · 3 EAF lines</p>
      </div>
    </SettingsSection>
  );
}
