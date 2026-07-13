"use client";

import { Flame } from "lucide-react";

import { APP_NAME } from "@/lib/constants";

export function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-950 lg:flex lg:w-1/2">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,122,26,0.25),transparent_45%)]" />
      <div className="relative z-10 flex flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold">{APP_NAME}</p>
            <p className="text-sm text-white/70">Decision Support Platform</p>
          </div>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">Raigarh SMS-3 EAF tap-to-tap intelligence.</h1>
          <p className="text-white/75">
            Predict cycle time, optimize recipes with physics constraints, and export industrial decision reports for
            Steel Melting Shop 3.
          </p>
        </div>
        <p className="text-sm text-white/50">JSPL Raigarh · SMS-3</p>
      </div>
    </div>
  );
}
