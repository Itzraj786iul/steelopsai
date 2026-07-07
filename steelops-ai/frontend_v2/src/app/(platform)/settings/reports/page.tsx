import { SettingsSection } from "@/features/onboarding/components/settings-section";

export default function Page() {
  return (
    <SettingsSection title="Reports" description="Scheduled exports and board deliverables">
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li>Daily executive summary — 06:00 IST</li>
        <li>Shift performance — end of shift</li>
        <li>Weekly ROI report — Monday 08:00</li>
      </ul>
    </SettingsSection>
  );
}
