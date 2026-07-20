"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Flame } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, type EnterpriseLoginResponse } from "@/lib/api/auth";
import { EAF_API_URL } from "@/lib/constants";
import { getDefaultRouteForRole } from "@/lib/rbac/permissions";
import { getApiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { email: "admin@jspl.local", password: "Admin@123", role: "Admin" },
  { email: "operator@jspl.local", password: "Oper@123", role: "Operator" },
  { email: "shift.a@jspl.local", password: "Shift@123", role: "Shift Engineer" },
  { email: "prod.manager@jspl.local", password: "Prod@123", role: "Production Manager" },
  { email: "plant.manager@jspl.local", password: "Plant@123", role: "Plant Manager" },
];

function useApiConfigWarning(): string | null {
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    const apiIsLocal = /localhost|127\.0\.0\.1/.test(EAF_API_URL);
    const pageIsRemote =
      window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
    if (apiIsLocal && pageIsRemote) {
      return (
        `Vercel is calling ${EAF_API_URL}, which only works on your PC. ` +
        "In Vercel → Project → Settings → Environment Variables, set NEXT_PUBLIC_EAF_API_URL " +
        "to your public FastAPI URL (e.g. https://your-api.onrender.com), then Redeploy."
      );
    }
    return null;
  }, []);
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const configWarning = useApiConfigWarning();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  // Lightweight wake-up (version does not load ML) so first click is not cold.
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${EAF_API_URL}/version`, { signal: ctrl.signal }).catch(() => undefined);
    return () => ctrl.abort();
  }, []);

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    try {
      const tokenResponse = await authApi.login(values);
      const data = tokenResponse.data as EnterpriseLoginResponse;
      setTokens(data.access_token, data.refresh_token, data.expires_in);
      const user = data.user ?? (await authApi.me()).data;
      setUser(user);
      const next = searchParams.get("next");
      const nextPath = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      const destination = nextPath || getDefaultRouteForRole(user.role);
      // Soft nav is fast; hard assign only as fallback if soft nav stalls.
      router.replace(destination);
      window.setTimeout(() => {
        if (window.location.pathname.startsWith("/login")) {
          window.location.assign(destination);
        }
      }, 800);
    } catch (err) {
      setError(getApiErrorMessage(err, "Invalid email or password"));
    }
  };

  return (
    <Card className="w-full max-w-md min-w-0 border-border/80 bg-card/95 shadow-elevation-md backdrop-blur">
      <CardHeader className="space-y-1 px-4 text-center sm:px-6">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Flame className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl sm:text-2xl">Sign in to JSPL EAF</CardTitle>
        <CardDescription>Enterprise authentication with role-based access</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {configWarning ? (
          <p className="mb-4 break-words rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-left text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            {configWarning}
          </p>
        ) : null}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
            {errors.password ? <p className="text-sm text-destructive">{errors.password.message}</p> : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <ActionButton type="submit" className="w-full" disabled={isSubmitting || !!configWarning}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </ActionButton>
        </form>

        <div className="mt-6 space-y-2 rounded-lg border border-dashed p-3">
          <p className="text-xs font-medium text-muted-foreground">Demo accounts</p>
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
              onClick={() => {
                setValue("email", a.email);
                setValue("password", a.password);
              }}
            >
              <span className="font-medium">{a.role}</span>
              <span className="break-all text-muted-foreground"> — {a.email}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
