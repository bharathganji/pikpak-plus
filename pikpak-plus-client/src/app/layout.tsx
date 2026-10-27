import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

const description =
  "Tordroid Plus is a private family portal for streaming and downloading from the shared PikPak storage over WebDAV.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "Tordroid Plus",
    template: "%s | Tordroid Plus",
  },
  description,
  applicationName: "Tordroid Plus",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Tordroid Plus",
    description,
    siteName: "Tordroid Plus",
    images: [{ url: "/pwa-512x512.png", width: 512, height: 512 }],
  },
  // Private family site: keep it out of search engines
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tordroid Plus",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          outfit.variable,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
