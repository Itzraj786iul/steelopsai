import { SettingsSection } from "@/features/onboarding/components/settings-section";

export default function Page() {
  return (
    <SettingsSection title="Appearance" description="Theme, density, and display preferences">
      <p className="text-sm text-muted-foreground">
        Use the theme toggle in the header to switch light and dark mode. Compact density ships in a future release.
      </p>
    </SettingsSection>
  );
}
