import { SettingsSection } from "@/features/onboarding/components/settings-section";

export default function Page() {
  return (
    <SettingsSection title="AI preferences" description="Confidence thresholds and decision modes">
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li>Auto-approve above 95% confidence — off</li>
        <li>Default decision mode — operator</li>
        <li>SHAP explanations — always on</li>
        <li>GREEN heat optimization — enabled</li>
      </ul>
    </SettingsSection>
  );
}
