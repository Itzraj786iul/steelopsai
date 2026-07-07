import { SettingsSection } from "@/features/onboarding/components/settings-section";

export default function Page() {
  return (
    <SettingsSection title="Notifications" description="Alerts, digests, and escalation rules">
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li>Heat risk alerts — enabled</li>
        <li>Approval pending — enabled</li>
        <li>Shift handover digest — enabled</li>
        <li>Executive weekly summary — enabled</li>
      </ul>
    </SettingsSection>
  );
}
