"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Loader2 } from "lucide-react";
import { resetPassword } from "@/lib/auth-client";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(String(err.response.data.message));
      } else {
        setError("Failed to reset password. Token may be invalid or expired.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md border border-destructive/30 bg-card/85 backdrop-blur-xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-destructive text-center text-xl font-bold">
            Invalid Link
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground text-sm">
            The password reset link is invalid or missing the token.
          </p>
          <Link href="/forgot-password">
            <Button variant="outline" className="border-border/80 hover:bg-muted/60">
              Request New Link
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full max-w-md border border-emerald-500/30 bg-card/85 backdrop-blur-xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-emerald-600 dark:text-emerald-400 text-center text-xl font-bold">
            Password Reset Successful
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground text-sm">
            Your password has been updated. Redirecting to login...
          </p>
          <div className="flex justify-center pt-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border border-border/60 bg-card/85 backdrop-blur-xl shadow-2xl relative z-10 transition-all hover:shadow-primary/10">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center bg-linear-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
          Reset Password
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert
              variant="destructive"
              className="bg-destructive/10 text-destructive border-destructive/25 rounded-lg shadow-xs"
            >
              <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              New Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-background/60 focus:bg-background border-border/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
              placeholder="New password"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-background/60 focus:bg-background border-border/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
              placeholder="Confirm new password"
            />
          </div>
          <Button
            className="w-full gradient-primary hover:opacity-95 transition-all duration-300 shadow-md shadow-primary/25 active:scale-[0.99] font-medium"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-background px-3 sm:px-6 relative overflow-x-hidden w-full selection:bg-primary/20">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-green-500/15 via-teal-500/15 to-cyan-500/15 pointer-events-none" />

      <Header />

      <main className="w-full flex-1 flex flex-col items-center justify-center py-8 sm:py-12 z-10">
        <div className="w-full max-w-md flex flex-col items-center animate-fade-in">
          <Suspense
            fallback={
              <Card className="w-full max-w-md p-6 border border-border/60 bg-card/85 backdrop-blur-xl shadow-2xl">
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              </Card>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
}
