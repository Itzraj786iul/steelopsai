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
  Sparkles,
  Target,
  Zap,
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
  { href: "#workflow", label: "Operator flow" },
  { href: "#trust", label: "Trust" },
] as const;

export function EafLandingHero() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,122,26,0.18),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,122,26,0.08),transparent_45%)]" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 focus-ring rounded-md">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Flame className="h-5 w-5 text-primary" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight">{APP_NAME}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                JSPL Raigarh · SMS-3
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Homepage">
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

          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative border-b border-border/40">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={industrialEase}
            className="max-w-3xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              JSPL Raigarh · Steel Melting Shop 3 (SMS-3)
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              {APP_NAME}
              <span className="mt-2 block text-primary">
                Electric Arc Furnace Tap-to-Tap Decision Support
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Predict tap-to-tap time, optimize burden with physics constraints, validate on the floor,
              and close the heat — built for Raigarh SMS-3 operators on the frozen {PRODUCTION_MODEL_PHASE}{" "}
              production model.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login?next=/eaf/prediction">
                  Sign in to predict
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/register">Create account</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/login?next=/eaf/dashboard">Open dashboard</Link>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Already authenticated? Go directly to{" "}
              <Link href="/eaf/prediction" className="font-medium text-primary hover:underline">
                Prediction
              </Link>{" "}
              or{" "}
              <Link href="/eaf/dashboard" className="font-medium text-primary hover:underline">
                Dashboard
              </Link>
              .
            </p>
          </motion.div>

          <motion.div
            className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {[
              { icon: LineChart, title: "Prediction", desc: `Stacking model · ${PRODUCTION_MODEL_PHASE}` },
              { icon: Cpu, title: "Optimization", desc: `Physics-guided · ${OPTIMIZER_PHASE}` },
              { icon: Zap, title: "Floor workflow", desc: "Predict → Optimize → Validate" },
              { icon: Sparkles, title: "Industrial ML", desc: "Explainability & trust" },
            ].map(({ icon: Icon, title, desc }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="rounded-xl border border-border/70 bg-card/80 p-4 text-left shadow-elevation-sm"
              >
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-2 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Plant */}
      <section id="plant" className="scroll-mt-20 border-b border-border/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Plant context</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Built for JSPL Raigarh SMS-3
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Steel Melting Shop 3 electric arc furnace operations — heat-level prediction and operator
            decision support aligned to plant practice.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Factory,
                title: "Site",
                body: "JSPL Raigarh · Steel Melting Shop 3 (SMS-3)",
              },
              {
                icon: Target,
                title: "Use case",
                body: "Tap-to-tap time prediction, recipe optimization, and heat validation on the floor.",
              },
              {
                icon: Shield,
                title: "Model posture",
                body: `Frozen ${PRODUCTION_MODEL_PHASE} production engine — advisory support, operator remains in control.`,
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border/70 bg-card/60 p-5">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="scroll-mt-20 border-b border-border/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Capabilities</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">What operators get</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "Predict tap-to-tap from burden and energy inputs",
              "Physics-guided optimizer with industrial constraints",
              "Historical similarity and side-by-side heat comparison",
              "Operator heat console — next steps without navbar hunting",
              "Validation, feedback, reports, and heat history",
              "Role-based access for operators, engineers, and managers",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="scroll-mt-20 border-b border-border/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Operator flow</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">One heat, clear path</h2>
          <ol className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "1", t: "Sign in", d: "Use your plant account" },
              { n: "2", t: "Predict", d: "Enter burden · get TTT" },
              { n: "3", t: "Optimize", d: "Review recommended changes" },
              { n: "4", t: "Validate", d: "Record actual TTT & feedback" },
            ].map((step) => (
              <li key={step.n} className="rounded-xl border border-border/70 bg-card/70 p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {step.n}
                </span>
                <p className="mt-3 font-semibold">{step.t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Button asChild>
              <Link href="/login?next=/eaf/prediction">
                Start operator workflow
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Trust & deployment</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Advisory AI for industrial control
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Recommendations support the melt shop; operators and engineers remain accountable for final
              furnace decisions. Production ML artifacts stay frozen for stability.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register">Sign up</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/eaf/about">About the system</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-semibold">{APP_NAME}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              JSPL Raigarh · SMS-3 · EAF Tap-to-Tap Decision Support
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Version {APP_VERSION}</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Sign up
            </Link>
            <Link href="/eaf/prediction" className="hover:text-foreground">
              Prediction
            </Link>
            <Link href="/eaf/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/eaf/about" className="hover:text-foreground">
              About
            </Link>
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
