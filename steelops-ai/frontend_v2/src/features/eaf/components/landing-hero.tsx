"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Factory,
  Flame,
  LineChart,
  Shield,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  APP_NAME,
  APP_VERSION,
  OPTIMIZER_PHASE,
  PRODUCTION_MODEL_PHASE,
} from "@/lib/constants";
import { fadeUp, industrialEase, staggerContainer } from "@/lib/motion";

const NAV_LINKS = [
  { href: "#plant", label: "Plant" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#workflow", label: "Workflow" },
  { href: "#trust", label: "Governance" },
] as const;

export function EafLandingHero() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top_left,rgba(255,122,26,0.14),transparent_55%)]" />

      {/* Header — auth only once */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-md focus-ring">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10">
              <Flame className="h-4 w-4 text-primary" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight">{APP_NAME}</span>
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                Raigarh SMS-3
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Homepage">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <Button asChild size="sm" className="shrink-0">
            <Link href="/login">
              Sign in
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative border-b border-border/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pb-20 lg:pt-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={industrialEase}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              JSPL Raigarh · Steel Melting Shop 3
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              Estimate furnace cycle time — then improve the mix
              <span className="mt-2 block text-xl font-semibold text-muted-foreground sm:text-2xl">
                Decision support for JSPL SMS-3 Electric Arc Furnace
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Built so a visitor can follow along: predict how long a heat takes (tap-to-tap / TTT),
              suggest a safer faster charge mix, then record what really happened. Operators stay in control —
              the AI is advisory on the frozen {PRODUCTION_MODEL_PHASE} production model.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/login">
                  Enter plant system
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#capabilities">View capabilities</a>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Need an account? Contact your plant administrator — self-signup is disabled in enterprise mode.
            </p>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...industrialEase, delay: 0.08 }}
            className="rounded-xl border border-border/70 bg-card/70 p-5 shadow-elevation-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Deployment profile
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-3">
                <dt className="text-muted-foreground">Plant</dt>
                <dd className="text-right font-medium">JSPL Raigarh · SMS-3</dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-3">
                <dt className="text-muted-foreground">Production model</dt>
                <dd className="text-right font-medium">{PRODUCTION_MODEL_PHASE}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-3">
                <dt className="text-muted-foreground">Optimizer</dt>
                <dd className="text-right font-medium">{OPTIMIZER_PHASE}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-3">
                <dt className="text-muted-foreground">Mode</dt>
                <dd className="text-right font-medium text-primary">Advisory · RBAC</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Release</dt>
                <dd className="text-right font-mono text-xs">{APP_VERSION}</dd>
              </div>
            </dl>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {[
                { icon: LineChart, label: "Predict cycle time" },
                { icon: Cpu, label: "Optimize mix" },
                { icon: Target, label: "Record result" },
                { icon: Shield, label: "Audit trail" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-2 text-xs font-medium"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                </div>
              ))}
            </div>
          </motion.aside>
        </div>
      </section>

      {/* Plant */}
      <section id="plant" className="scroll-mt-20 border-b border-border/40 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Plant</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">JSPL Raigarh SMS-3</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Steel Melting Shop 3 EAF operations — heat-level decision support aligned to plant practice
              and shift workflow.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Factory,
                title: "Site scope",
                body: "Raigarh SMS-3 electric arc furnace line for planning and floor review.",
              },
              {
                icon: Target,
                title: "Operating focus",
                body: "Tap-to-tap prediction, burden optimization, and post-heat validation.",
              },
              {
                icon: Shield,
                title: "Control posture",
                body: "Frozen production model. Recommendations are advisory; furnace control stays with the crew.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="border border-border/60 bg-card/50 p-5">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="scroll-mt-20 border-b border-border/40 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Capabilities</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">What the platform delivers</h2>
          </div>
          <motion.ul
            className="mt-8 grid gap-3 sm:grid-cols-2"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-40px" }}
          >
            {[
              "Tap-to-tap prediction from burden and energy inputs",
              `Physics-guided optimizer (${OPTIMIZER_PHASE})`,
              "Historical similarity and heat comparison",
              "Operator heat console for next-step workflow",
              "Validation, feedback, and heat history",
              "Role-based access for floor and management",
            ].map((item) => (
              <motion.li
                key={item}
                variants={fadeUp}
                className="flex gap-3 border border-border/50 bg-muted/15 px-4 py-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm leading-relaxed">{item}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="scroll-mt-20 border-b border-border/40 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Workflow</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Standard heat path</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Four plain steps — even if you are new to steelmaking, the path stays the same.
            </p>
          </div>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "Predict", d: "Enter the charge mix · estimate cycle time (TTT)" },
              { n: "02", t: "Optimize", d: "Review safer, faster suggested changes" },
              { n: "03", t: "Decide", d: "Accept, modify, or reject the suggestion" },
              { n: "04", t: "Validate", d: "Record real minutes & close the heat" },
            ].map((step) => (
              <li key={step.n} className="border border-border/60 bg-card/40 p-5">
                <span className="font-mono text-xs text-primary">{step.n}</span>
                <p className="mt-2 text-sm font-semibold">{step.t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Governance */}
      <section id="trust" className="scroll-mt-20 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="border border-border/60 bg-card/40 px-5 py-8 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Governance</p>
            <h2 className="mt-2 max-w-xl text-2xl font-bold tracking-tight">
              Advisory support for industrial operations
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Outputs assist melt-shop decisions. Final furnace actions remain with operators and
              engineers. Production ML artifacts are frozen for deployment stability.
            </p>
            <div className="mt-6">
              <Button asChild>
                <Link href="/login">
                  Sign in to continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-muted/15">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold">{APP_NAME}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              JSPL Raigarh · SMS-3
              <br />
              EAF Tap-to-Tap Decision Support
            </p>
            <p className="mt-3 font-mono text-xs text-muted-foreground">v{APP_VERSION}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sections</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="hover:text-foreground">
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <Link href="/eaf/about" className="hover:text-foreground">
                  About
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Access</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-foreground">
                  Sign in
                </Link>
              </li>
              <li className="text-xs leading-relaxed">
                Accounts are provisioned by plant IT / admin. Self-registration is not enabled for production.
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/40">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
            Confidential — JSPL plant operations use only. Not a substitute for furnace control systems.
          </p>
        </div>
      </footer>
    </div>
  );
}
