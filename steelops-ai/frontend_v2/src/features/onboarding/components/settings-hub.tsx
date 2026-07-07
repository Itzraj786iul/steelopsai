"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { SETTINGS_SECTIONS } from "@/features/onboarding/utils/onboarding-data";

export function SettingsHub() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Plant configuration, users, integrations, and preferences"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_SECTIONS.map((section) => (
          <Link
            key={section.id}
            href={section.href}
            className="group flex items-start gap-4 rounded-xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-elevation-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <section.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium group-hover:text-primary">{section.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
