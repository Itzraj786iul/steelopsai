"use client";

import Link from "next/link";

import { DashboardLayout, PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/feedback/error-state";
import { PortfolioGrid } from "@/features/preheat/components/recipe-card";
import { ActionButton } from "@/components/data-display/action-button";
import { usePreheatStore } from "@/stores/preheat-store";
import { sortPortfolio } from "@/features/preheat/utils/preheat-utils";

export function PortfolioPage() {
  const pkg = usePreheatStore((state) => state.activePackage);

  if (!pkg) {
    return (
      <DashboardLayout>
        <ErrorState message="No portfolio available. Run pre-heat analysis to generate recipe candidates." />
      </DashboardLayout>
    );
  }

  const portfolio = sortPortfolio(pkg.alternative_recipes);

  return (
    <DashboardLayout>
      <PageHeader
        title="Recipe portfolio"
        description="Top generated recipes ranked by strategy: Fast, Balanced, Safe, Cheapest, Conservative."
        actions={
          <ActionButton asChild>
            <Link href="/recipes/compare">Open comparison</Link>
          </ActionButton>
        }
      />
      <PortfolioGrid recipes={portfolio} compareBaseHref="/recipes/compare" />
    </DashboardLayout>
  );
}
