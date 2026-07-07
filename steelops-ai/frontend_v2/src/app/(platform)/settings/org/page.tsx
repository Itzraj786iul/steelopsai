import { SettingsSection } from "@/features/onboarding/components/settings-section";
import { PlantSettingsContent } from "@/features/onboarding/components/plant-settings-content";

export default function Page() {
  return (
    <SettingsSection title="Plant" description="Furnaces, shifts, and production targets">
      <PlantSettingsContent />
    </SettingsSection>
  );
}
