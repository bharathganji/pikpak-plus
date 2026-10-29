"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { DisclaimerModal } from "@/components/disclaimer-modal";
import {
  Share2,
  Download,
  History,
  Zap,
  Tv,
  HardDrive,
  ArrowRight,
  ShieldCheck,
  Radio,
  CheckCircle2,
  ExternalLink,
  Loader2,
  PlayCircle,
} from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // If user is already authenticated, take them directly to the dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-background text-foreground overflow-x-hidden w-full selection:bg-primary/20">
      {/* Background Decorative Gradient */}
      <div className="fixed inset-0 bg-radial-[at_50%_0%] from-primary/10 via-background to-background pointer-events-none -z-10" />

      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="w-full max-w-6xl px-4 pt-12 pb-16 md:pt-20 md:pb-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs sm:text-sm font-medium">
          <Zap className="h-3.5 w-3.5" />
          <span>Cloud Torrent Caching & Direct WebDAV Streaming</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl text-balance">
          Supercharge your cloud downloads with{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            zero local bandwidth.
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl text-balance leading-relaxed">
          PikPak Plus fetches magnet links, torrents, and web URLs straight to high-speed cloud storage. Stream directly to your favorite media players via WebDAV without waiting for downloads.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link href="/register">
            <Button size="lg" className="gap-2 text-base px-6 h-12 shadow-md shadow-primary/20 hover:scale-105 transition-all">
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="gap-2 text-base px-6 h-12 hover:bg-muted/50 transition-all">
              <span>Sign In to Workspace</span>
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="ghost" className="text-base px-4 h-12 text-muted-foreground hover:text-foreground">
              <span>Explore Features</span>
            </Button>
          </Link>
        </div>

        {/* Highlight Badges */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-3xl">
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-border/50 bg-card/50 text-xs sm:text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium">25 GB File Capacity</span>
          </div>
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-border/50 bg-card/50 text-xs sm:text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium">Direct WebDAV Mount</span>
          </div>
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-border/50 bg-card/50 text-xs sm:text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium">Instant Cloud Cache</span>
          </div>
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-border/50 bg-card/50 text-xs sm:text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium">Multi-Device Playback</span>
          </div>
        </div>
      </section>

      {/* Feature Pillars Section */}
      <section id="features" className="w-full max-w-6xl px-4 py-16 scroll-mt-12">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-2">Core Capabilities</Badge>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Designed for Speed, Streaming & Simplicity
          </h2>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            Everything you need to handle cloud transfers and remote streaming in one unified platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-xs hover:border-primary/40 transition-colors flex flex-col justify-between">
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Share2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Cloud Magnet Transfers</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Paste magnet links, info hashes, or HTTP URLs. Cloud background workers download and cache your files at lightning speeds with zero local bandwidth overhead.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/60 p-3 text-xs font-mono text-muted-foreground border border-border/40">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-foreground font-semibold">magnet:?xt=urn:btih:...</span>
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">Cached</Badge>
                </div>
                <div className="w-full bg-background/80 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-full rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pillar 2 */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-xs hover:border-primary/40 transition-colors flex flex-col justify-between">
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Tv className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Instant WebDAV Streaming</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Mount your storage directly in media players like Infuse, Kodi, VLC, or PotPlayer. Stream high-bitrate 4K video instantly without local file copies.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/60 p-3 text-xs font-mono text-muted-foreground border border-border/40 flex items-center justify-between">
                <span className="truncate mr-2">webdav.pikpak-plus.com</span>
                <Badge variant="outline" className="text-[10px] shrink-0 text-primary border-primary/30">Port 443</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Pillar 3 */}
          <Card className="border border-border/60 bg-card/60 backdrop-blur-xs hover:border-primary/40 transition-colors flex flex-col justify-between">
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <History className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Activity & Direct Access</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Track personal task retention, view share histories, monitor daily quotas, and trigger direct signed download links straight to your device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground border border-border/40 flex items-center justify-between">
                <span>Task Retention Active</span>
                <span className="font-semibold text-foreground">7 Days Retention</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* WebDAV Client Ecosystem Section */}
      <section id="webdav" className="w-full max-w-6xl px-4 py-16 scroll-mt-12 border-t border-border/40">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-2">Cross-Platform</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Connect Anywhere via WebDAV
          </h2>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
            Compatible with all industry-standard WebDAV streaming clients across Smart TV, Desktop, and Mobile.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {[
            { name: "Infuse", platform: "Apple TV / iOS", tag: "4K HDR" },
            { name: "Kodi", platform: "Android TV / PC", tag: "Open Source" },
            { name: "VLC", platform: "Cross-Platform", tag: "Universal" },
            { name: "PotPlayer", platform: "Windows", tag: "Direct Stream" },
            { name: "CX Explorer", platform: "Android / FireTV", tag: "File Manager" },
            { name: "NPlayer", platform: "iOS / Android", tag: "Hardware Accel" },
          ].map((client) => (
            <div
              key={client.name}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/50 bg-card/40 text-center hover:bg-muted/40 transition-colors"
            >
              <PlayCircle className="h-8 w-8 text-primary mb-2 opacity-80" />
              <h3 className="font-semibold text-sm">{client.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{client.platform}</p>
              <Badge variant="secondary" className="mt-2 text-[10px]">{client.tag}</Badge>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="w-full max-w-4xl px-4 py-16 border-t border-border/40">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-2">FAQ</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border/50 bg-card/40">
            <h3 className="font-semibold text-base mb-1">What is PikPak Plus?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              PikPak Plus is a web-based client and cloud bridge allowing users to experience cloud torrent caching, remote file management, and WebDAV media streaming in a modern interface.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-card/40">
            <h3 className="font-semibold text-base mb-1">How do I stream videos via WebDAV?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Once registered, visit your Dashboard under &quot;Downloads &amp; WebDAV&quot; to view your unique WebDAV host, credentials, and connection instructions for Infuse, Kodi, VLC, or PotPlayer.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-card/40">
            <h3 className="font-semibold text-base mb-1">Are there file size limits?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Files up to 25 GB are supported per single transfer task. Cloud workers automatically process and cache valid torrents and media streams.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/50 bg-card/40">
            <h3 className="font-semibold text-base mb-1">Where can I see live service uptime &amp; stats?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Check out our public{" "}
              <Link href="/statistics" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
                Statistics Page <ExternalLink className="h-3 w-3 inline" />
              </Link>{" "}
              for real-time server task processing charts and scheduler updates.
            </p>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="w-full max-w-6xl px-4 py-12 mb-8">
        <div className="rounded-2xl border border-primary/20 bg-linear-to-r from-primary/10 via-card to-primary/5 p-8 md:p-12 text-center flex flex-col items-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight max-w-xl">
            Ready to experience effortless cloud media streaming?
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-md">
            Create an account in seconds or sign in to access your dashboard.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                <span>Create Free Account</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer & Disclaimer */}
      <Footer />
      <DisclaimerModal />
    </div>
  );
}
