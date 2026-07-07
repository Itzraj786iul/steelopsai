"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Flame } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { isGuestAuthMode } from "@/lib/auth/guest-auth";
import { getDefaultRouteForRole } from "@/lib/rbac/permissions";
import { getApiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, setUser } = useAuthStore();
  const needsWelcome = useOnboardingStore((s) => s.needsWelcome);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    try {
      const tokenResponse = await authApi.login(values);
      setTokens(tokenResponse.data.access_token, tokenResponse.data.refresh_token, tokenResponse.data.expires_in);
      const userResponse = await authApi.me();
      setUser(userResponse.data);
      const next = searchParams.get("next");
      if (needsWelcome()) {
        router.replace("/onboarding");
      } else if (next && next.startsWith("/")) {
        router.replace(next);
      } else if (isGuestAuthMode()) {
        router.replace("/eaf/dashboard");
      } else {
        router.replace(getDefaultRouteForRole(userResponse.data.role));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Invalid email or password"));
    }
  };

  return (
    <Card className="w-full max-w-md border-border/80 bg-card/95 shadow-elevation-md backdrop-blur">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Flame className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Sign in to JSPL EAF</CardTitle>
        <CardDescription>Tap-to-Tap prediction and optimization platform</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
            {errors.password ? <p className="text-sm text-destructive">{errors.password.message}</p> : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <ActionButton type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </ActionButton>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
