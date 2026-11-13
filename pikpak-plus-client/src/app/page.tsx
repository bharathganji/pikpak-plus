import type { Metadata } from "next";
import { headers } from "next/headers";
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
import { MaintenanceBanner } from "@/components/maintenance-banner";
import {
  ShieldCheck,
  Download,
  Share2,
  FolderSync,
  Trash2,
  BarChart3,
  ArrowRight,
  ExternalLink,
  Search,
  Wrench,
} from "lucide-react";

/**
 * SEO & Search Engine Indexing Preservation Metadata
 *
 * CRITICAL (Google Search Central Guidelines):
 * Even during an extended maintenance window (such as 10 days of maintenance),
 * the homepage must remain accessible with HTTP 200 OK, canonical URL, and complete
 * metadata so Googlebot continues indexing the site without de-indexing or replacing
 * snippets with temporary error/maintenance pages.
 */
export const metadata: Metadata = {
  title: "PikPak Plus - Unofficial PikPak Cloud Manager & WebDAV Bridge",
  description:
    "Share your PikPak [Premium] with your friends and family! Manage cloud downloads, create deduplicated share links, and auto-generate WebDAV clients.",
  alternates: {
    canonical: "https://pikpak-plus.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "PikPak Plus - Unofficial Implementation of PikPak",
    description:
      "Share your PikPak [Premium] with your friends and family! Manage cloud downloads, create deduplicated share links, and auto-generate WebDAV clients.",
    url: "https://pikpak-plus.com",
    siteName: "PikPak Plus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PikPak Plus - Unofficial PikPak Cloud Manager & WebDAV Bridge",
    description:
      "Share your PikPak [Premium] with your friends and family! Manage cloud downloads, create deduplicated share links, and auto-generate WebDAV clients.",
  },
};

/**
 * Structured Data (Schema.org JSON-LD)
 * Provides permanent semantic identity to Google and other search engines.
 */
const jsonLdData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://pikpak-plus.com/#website",
      url: "https://pikpak-plus.com",
      name: "PikPak Plus",
      description: "Unofficial PikPak Cloud Manager & WebDAV Bridge",
      inLanguage: "en-US",
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://pikpak-plus.com/#software",
      name: "PikPak Plus",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "All",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "Share your PikPak [Premium] with your friends and family! Manage cloud downloads, create deduplicated share links, and auto-generate WebDAV clients.",
    },
  ],
};

export default async function Home() {
  const headersList = await headers();
  const isMaintenanceMode =
    headersList.get("x-maintenance-mode") === "active" ||
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true" ||
        process.env.MAINTENANCE_MODE === "true"));

  return (
    <div className="min-h-screen flex flex-col items-center bg-background text-foreground overflow-x-hidden w-full selection:bg-primary/20">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />

      {/* Client Island: Automatically redirects authenticated users to /dashboard (when not in maintenance) */}
      {!isMaintenanceMode && <AuthRedirect to="/dashboard" />}

      <Header isMaintenance={isMaintenanceMode} />

      <main className="w-full max-w-5xl px-4 py-8 md:py-16 flex flex-col items-center">
        {/* Maintenance Banner: Informs users while preserving 200 OK SEO indexability */}
        {isMaintenanceMode && <MaintenanceBanner />}

        {/* Hero Section directly matching README */}
        <section className="text-center max-w-3xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 mb-5 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs sm:text-sm font-medium shadow-xs">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>Unofficial Implementation of PikPak</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-balance bg-linear-to-b from-foreground via-foreground to-foreground/80 bg-clip-text">
            Share your PikPak [Premium] with your friends and family!
          </h1>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed text-balance">
            PikPak Plus enhances the PikPak cloud storage experience by enabling
            easy sharing of your PikPak Premium account. Built with modern web
            technologies, it provides a seamless interface for managing
            downloads, creating share links, and generating WebDAV clients.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {isMaintenanceMode ? (
              <>
                <Link href="/maintenance">
                  <Button
                    size="lg"
                    className="gap-2 text-base px-6 h-11 bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 transition-all"
                  >
                    <Wrench className="h-4 w-4" />
                    <span>Maintenance Status</span>
                  </Button>
                </Link>
                <Link href="/faq">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-base px-6 h-11 border-border/80 hover:bg-muted/60 transition-all"
                  >
                    <span>Read FAQ</span>
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    size="lg"
                    className="gap-2 text-base px-6 h-11 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 transition-all"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-base px-6 h-11 border-border/80 hover:bg-muted/60 transition-all"
                  >
                    <span>Sign Up</span>
                  </Button>
                </Link>
              </>
            )}
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-base px-5 h-11 border-border/80 hover:bg-muted/60 transition-all gap-2"
            >
              <a
                href="https://jackett.pikpak-plus.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Search className="h-4 w-4" />
                <span>Search Torrents</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
            </Button>
            <Link href="/statistics">
              <Button
                size="lg"
                variant="ghost"
                className="text-base px-4 h-11 text-muted-foreground hover:text-foreground gap-1.5 transition-all"
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
            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 ring-1 ring-primary/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Secure Authentication
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  Uses Supabase for user authentication without storing PikPak
                  passwords.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 ring-1 ring-primary/20">
                  <Download className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Task Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  Create and monitor download tasks from magnet links with
                  real-time status updates.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 ring-1 ring-primary/20">
                  <Share2 className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Smart Share Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  Global share deduplication ensures one link per file, reused
                  by all users.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 ring-1 ring-primary/20">
                  <FolderSync className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  WebDAV Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  Auto-generate WebDAV clients for easy access from any
                  WebDAV-compatible application.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 ring-1 ring-primary/20">
                  <Trash2 className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Auto Cleanup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  Automated task cleanup after 24 hours to maintain account
                  hygiene and storage health.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 ring-1 ring-primary/20">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Quota Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  Real-time tracking of personal storage and bandwidth usage,
                  with historical statistics charts.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick Links / Community Bar */}
        <section className="w-full mt-12 pt-8 border-t border-border/50 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground">
          <p>
            An educational open-source project. For actual cloud file storage,
            please use the official PikPak service.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://jackett.pikpak-plus.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors inline-flex items-center gap-1 font-medium"
            >
              Search Torrents <ExternalLink className="h-3 w-3" />
            </a>
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
