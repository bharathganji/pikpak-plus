"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useAuth } from "@/components/auth-provider";
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
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
      await register(email, password);
      // Redirect handled by AuthProvider/Router
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(String(err.response.data.message));
      } else {
        setError("Failed to register. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.15),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-linear-to-bl from-background via-background to-primary/5 pointer-events-none" />

      <div className="w-full max-w-md flex flex-col items-center gap-8 relative z-10 animate-fade-in">
        <Image
          src="/pikpak-plus.png"
          alt="PikPak Plus"
          width={280}
          height={70}
          className="h-14 sm:h-16 w-auto drop-shadow-2xl transition-transform duration-500 hover:scale-105"
          priority
        />

        <Card className="w-full border border-border/60 bg-card/85 backdrop-blur-xl shadow-2xl transition-all hover:shadow-primary/10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center bg-linear-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
              Create Account
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Enter your email below to create your account
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
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background/60 focus:bg-background border-border/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                    Creating account...
                  </>
                ) : (
                  "Sign Up"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-2">
            <div className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
