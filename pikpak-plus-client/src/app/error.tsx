"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors for telemetry and auditing
    console.error("Next.js App Router caught segment error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-destructive/30 shadow-xl bg-card">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-3">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-1">
            An unexpected error occurred while loading this view. You can try
            recovering or return to the main dashboard.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground font-mono break-words border border-border/50">
            <p className="font-semibold text-destructive mb-1">
              {error.name || "Error"}:{" "}
              {error.message || "Unknown error occurred"}
            </p>
            {error.digest && (
              <p className="text-[11px] opacity-75">
                Digest: <span className="select-all">{error.digest}</span>
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto gap-2"
            variant="default"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Return Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
