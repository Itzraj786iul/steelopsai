import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { SectionCard } from "@/components/layout/section-card";
import { QUICK_ACTIONS } from "@/lib/navigation";

export function EafQuickActions() {
  return (
    <SectionCard title="Quick Actions" description="Jump to core decision-support workflows">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
          <ActionButton key={action.id} variant="outline" className="h-auto justify-between px-4 py-3" asChild>
            <Link href={action.href}>
              <span>{action.label}</span>
              <ArrowRight className="h-4 w-4 opacity-60" />
            </Link>
          </ActionButton>
        ))}
        <ActionButton variant="outline" className="h-auto justify-between px-4 py-3" asChild>
          <Link href="/eaf/settings">
            <span>Settings</span>
            <ArrowRight className="h-4 w-4 opacity-60" />
          </Link>
        </ActionButton>
      </div>
    </SectionCard>
  );
}
