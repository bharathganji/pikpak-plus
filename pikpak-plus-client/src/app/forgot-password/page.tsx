"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Loader2 } from "lucide-react";
import { forgotPassword } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await forgotPassword(email);
      setSuccess(
        "If a user with this email exists, a password reset link has been sent.",
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(String(err.response.data.message));
      } else {
        setError("Failed to request password reset. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-background px-3 sm:px-6 relative overflow-x-hidden w-full selection:bg-primary/20">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-linear-to-tr from-cyan-500/15 via-blue-500/15 to-purple-500/15 pointer-events-none" />

      <Header />

      <main className="w-full flex-1 flex flex-col items-center justify-center py-8 sm:py-12 z-10">
        <div className="w-full max-w-md flex flex-col items-center animate-fade-in">
          <Card className="w-full border border-border/60 bg-card/85 backdrop-blur-xl shadow-2xl transition-all hover:shadow-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center bg-linear-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
            Forgot Password
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Enter your email to receive a password reset link
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
            {success && (
              <Alert variant="success" className="rounded-lg shadow-xs">
                <AlertDescription className="text-sm font-medium">{success}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/60 focus:bg-background border-border/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
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
                  Sending link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
          >
            Back to Sign In
          </Link>
        </CardFooter>
        </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
