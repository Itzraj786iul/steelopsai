"use client";

import { useMemo, useState } from "react";
import { Mail, MessageCircle, Search, Video } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/layout/section-card";
import { HELP_ARTICLES, KEYBOARD_SHORTCUTS } from "@/features/onboarding/utils/onboarding-data";

const FAQ = [
  { q: "How do I run the interactive demo?", a: "Go to Onboarding and click Run Interactive Demo, or pick a scenario from the Demo Library." },
  { q: "Can I skip plant setup?", a: "Yes — use Skip for now on the welcome screen. You can complete the installation wizard later." },
  { q: "Where is the executive dashboard?", a: "Navigate to Executive in the sidebar or press ⌘K and search Executive." },
  { q: "How do I connect SAP?", a: "Open Settings → Integrations and configure the SAP ERP card." },
];

export function HelpCenter() {
  const [query, setQuery] = useState("");

  const articles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HELP_ARTICLES;
    return HELP_ARTICLES.filter(
      (a) => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="space-y-8">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search documentation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <SectionCard title="Documentation" description="Guides and walkthroughs">
        <div className="grid gap-3 sm:grid-cols-2">
          {articles.map((article) => (
            <div key={article.id} className="rounded-lg border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">{article.category}</p>
              <h3 className="mt-1 font-medium">{article.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{article.summary}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="FAQ">
        <div className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q}>
              <p className="font-medium">{item.q}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Video tutorials" description="Placeholder library">
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-muted-foreground">
            <Video className="h-8 w-8" />
            <p className="text-sm">Product overview, mission workflow, and executive boardroom — videos ship with pilot deployment.</p>
          </div>
        </SectionCard>

        <SectionCard title="Keyboard shortcuts">
          <ul className="space-y-2">
            {KEYBOARD_SHORTCUTS.map((s) => (
              <li key={s.keys} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{s.action}</span>
                <kbd className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{s.keys}</kbd>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Contact support">
        <div className="flex flex-wrap gap-3">
          <ActionButton variant="outline">
            <Mail className="h-4 w-4" />
            support@steelops.ai
          </ActionButton>
          <ActionButton variant="outline">
            <MessageCircle className="h-4 w-4" />
            Live chat (pilot)
          </ActionButton>
        </div>
      </SectionCard>
    </div>
  );
}
