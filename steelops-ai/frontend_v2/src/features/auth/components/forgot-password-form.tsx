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

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (values: ForgotValues) => {
    setSubmittedEmail(values.email);
  };

  return (
    <Card className="w-full max-w-md border-border/80 bg-card/95 shadow-elevation-md">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Password recovery is managed by your plant administrator. Submit your work email to continue with the
          enterprise reset process.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submittedEmail ? (
          <div className="space-y-4 rounded-lg border border-border/80 bg-muted/30 p-4 text-sm">
            <p>
              If an account exists for <strong>{submittedEmail}</strong>, contact your plant IT administrator or shift
              supervisor to reset credentials through enterprise user management.
            </p>
            <p className="text-muted-foreground">
              SteelOps AI does not expose a self-service password reset endpoint in the current backend release.
            </p>
            <ActionButton asChild className="w-full">
              <Link href="/login">Return to sign in</Link>
            </ActionButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
            </div>
            <ActionButton type="submit" className="w-full" disabled={isSubmitting}>
              Continue
            </ActionButton>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
