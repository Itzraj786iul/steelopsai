"use client";

import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { ActionButton } from "@/components/data-display/action-button";
import { useAuth } from "@/hooks/use-auth";
import { getDefaultRouteForRole } from "@/lib/rbac/permissions";

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const home = getDefaultRouteForRole(user?.role ?? "operator");
  const homeLabel =
    home.includes("admin")
      ? "Return to Admin Dashboard"
      : home.includes("production-manager")
        ? "Return to Production Hub"
        : home.includes("plant-manager")
          ? "Return to Plant Overview"
          : home.includes("validation")
            ? "Return to Validation"
            : "Return to your home";

  return (
    <PageContainer
      title="Access restricted"
      description="This area belongs to another role. Use your sidebar, or switch to a demo account that owns this flow."
    >
      <SectionCard>
        <EmptyState
          title="You don’t have access to this area"
          description={
            user?.role
              ? `Signed in as ${user.full_name || user.email} (${user.role}). Open a page from your sidebar, or sign in with Operator / Production Manager / Plant Manager / Admin to walk that flow.`
              : "Sign in with the role that owns this flow, then use the sidebar."
          }
        />
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ActionButton asChild>
            <Link href={home}>{homeLabel}</Link>
          </ActionButton>
          <ActionButton asChild variant="outline">
            <Link href="/login">Switch account</Link>
          </ActionButton>
        </div>
      </SectionCard>
    </PageContainer>
  );
}
