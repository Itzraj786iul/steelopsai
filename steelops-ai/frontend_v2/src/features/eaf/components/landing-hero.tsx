"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Cpu, LineChart, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EafLandingHero() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
      <div className="relative mx-auto max-w-6xl px-6 py-20 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium uppercase tracking-widest text-primary"
        >
          JSPL Industrial Decision Support
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-4 text-4xl font-bold tracking-tight md:text-5xl"
        >
          AI-Powered Electric Arc Furnace
          <br />
          <span className="text-primary">Tap-to-Tap Prediction System</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          Prediction, physics-guided optimization, real-time analytics, and industrial ML —
          built on the frozen Phase 19 production model.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          <Button asChild size="lg">
            <Link href="/eaf/prediction">Start Prediction <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/eaf/dashboard">View Dashboard</Link>
          </Button>
        </motion.div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: LineChart, title: "Prediction", desc: "Stacking Regressor, MAE 3.06 min" },
            { icon: Cpu, title: "Optimization", desc: "Physics-guided Phase 20.2" },
            { icon: Zap, title: "Real-time Analytics", desc: "What-if & sensitivity" },
            { icon: Sparkles, title: "Industrial ML", desc: "22 production features" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border bg-card p-6 text-left shadow-elevation-sm">
              <Icon className="h-8 w-8 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
