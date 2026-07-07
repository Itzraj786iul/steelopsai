"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/eaf/dashboard", label: "Dashboard" },
  { href: "/eaf/prediction", label: "Prediction" },
  { href: "/eaf/optimizer", label: "Optimizer" },
  { href: "/eaf/whatif", label: "What-if" },
  { href: "/eaf/historical", label: "Historical" },
  { href: "/eaf/health", label: "Health" },
  { href: "/eaf/model", label: "Model" },
  { href: "/eaf/reports", label: "Reports" },
  { href: "/eaf/about", label: "About" },
];

export default function EafLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b pb-4">
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              pathname === href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
