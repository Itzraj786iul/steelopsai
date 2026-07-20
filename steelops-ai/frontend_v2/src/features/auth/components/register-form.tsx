"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ActionButton } from "@/components/data-display/action-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { DEFAULT_TENANT_SLUG } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";

const registerSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  tenant_slug: z.string().min(2),
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { setTokens, setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { tenant_slug: DEFAULT_TENANT_SLUG },
  });

  const onSubmit = async (values: RegisterValues) => {
    setError(null);
    setSuccess(null);
    try {
      await authApi.register(values);
      setSuccess("Account created. Redirecting to EAF dashboard…");
      const login = await authApi.login({ email: values.email, password: values.password });
      setTokens(login.data.access_token, login.data.refresh_token, login.data.expires_in);
      const user = await authApi.me();
      setUser(user.data);
      window.location.assign("/eaf/prediction");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <Card className="w-full max-w-md border-border/80 bg-card/95 shadow-elevation-md">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Register for JSPL EAF Tap-to-Tap decision support</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" {...register("full_name")} />
            {errors.full_name ? <p className="text-sm text-destructive">{errors.full_name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password ? <p className="text-sm text-destructive">{errors.password.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant_slug">Tenant</Label>
            <Input id="tenant_slug" {...register("tenant_slug")} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-accent">{success}</p> : null}
          <ActionButton type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Register"}
          </ActionButton>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
