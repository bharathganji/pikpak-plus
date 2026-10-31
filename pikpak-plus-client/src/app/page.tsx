import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { DisclaimerModal } from "@/components/disclaimer-modal";
import { AuthRedirect } from "@/components/auth/auth-redirect";
import {
  ShieldCheck,
  Download,
  Share2,
  FolderSync,
  Trash2,
  BarChart3,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export const metadata: Metadata = {
  title: "PikPak Plus - Unofficial PikPak Cloud Manager & WebDAV Bridge",
  description:
    "Share your PikPak [Premium] with your friends and family! Manage cloud downloads, create deduplicated share links, and auto-generate WebDAV clients.",
  openGraph: {
    title: "PikPak Plus - Unofficial Implementation of PikPak",
    description:
      "Share your PikPak [Premium] with your friends and family! Manage cloud downloads, create deduplicated share links, and auto-generate WebDAV clients.",
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-background text-foreground overflow-x-hidden w-full selection:bg-primary/20">
      {/* Client Island: Automatically redirects authenticated users to /dashboard */}
      <AuthRedirect to="/dashboard" />

      <Header />

      <main className="w-full max-w-5xl px-4 py-8 md:py-16 flex flex-col items-center">
        {/* Hero Section directly matching README */}
        <section className="text-center max-w-3xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs sm:text-sm font-medium">
            <span>Unofficial Implementation of PikPak</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-balance">
            Share your PikPak [Premium] with your friends and family!
          </h1>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed text-balance">
            PikPak Plus enhances the PikPak cloud storage experience by enabling
            easy sharing of your PikPak Premium account. Built with modern web
            technologies, it provides a seamless interface for managing
            downloads, creating share links, and generating WebDAV clients.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login">
              <Button size="lg" className="gap-2 text-base px-6 h-11">
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="lg"
                variant="outline"
                className="text-base px-6 h-11"
              >
                <span>Sign Up</span>
              </Button>
            </Link>
            <Link href="/statistics">
              <Button
                size="lg"
                variant="ghost"
                className="text-base px-4 h-11 text-muted-foreground hover:text-foreground gap-1.5"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Statistics</span>
              </Button>
            </Link>
          </div>
        </section>

        {/* Key Features from README */}
        <section className="w-full mt-14 md:mt-20">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Key Features
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Everything provided by the platform as described in our
              documentation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border border-border/60 bg-card/50">
              <CardHeader className="pb-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Secure Authentication
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm leading-relaxed">
                  Uses Supabase for user authentication without storing PikPak
                  passwords.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/50">
              <CardHeader className="pb-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Download className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Task Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm leading-relaxed">
                  Create and monitor download tasks from magnet links with
                  real-time status updates.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/50">
              <CardHeader className="pb-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Share2 className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Smart Share Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm leading-relaxed">
                  Global share deduplication ensures one link per file, reused
                  by all users.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/50">
              <CardHeader className="pb-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <FolderSync className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  WebDAV Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm leading-relaxed">
                  Auto-generate WebDAV clients for easy access from any
                  WebDAV-compatible application.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/50">
              <CardHeader className="pb-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Trash2 className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Auto Cleanup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm leading-relaxed">
                  Automated task cleanup after 24 hours to maintain account
                  hygiene and storage health.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/50">
              <CardHeader className="pb-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Quota Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm leading-relaxed">
                  Real-time tracking of personal storage and bandwidth usage,
                  with historical statistics charts.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick Links / Community Bar */}
        <section className="w-full mt-12 pt-8 border-t border-border/40 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground">
          <p>
            An educational open-source project. For actual cloud file storage,
            please use the official PikPak service.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/bharathganji/pikpak-plus"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors inline-flex items-center gap-1 font-medium"
            >
              GitHub <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://t.me/pikpak_plus"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors inline-flex items-center gap-1 font-medium"
            >
              Telegram <ExternalLink className="h-3 w-3" />
            </a>
            <Link
              href="/faq"
              className="hover:text-primary transition-colors font-medium"
            >
              FAQ
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <DisclaimerModal />
    </div>
  );
}
