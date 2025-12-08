import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://pikpak-plus.com"),
  title: {
    default: "PikPak Plus - Web-based Clone of PikPak Service",
    template: "%s | PikPak Plus",
  },
  description:
    "PikPak Plus is a web-based clone of the popular PikPak service that allows users to experience PikPak's features and functionality in a web environment for educational purposes.",
  keywords: [
    "pikpak",
    "pikpak clone",
    "webdav",
    "file management",
    "cloud storage",
    "file sharing",
    "file transfer",
    "pikpak web",
    "pikpak alternative",
    "pikpak experience",
  ],
  authors: [{ name: "PikPak Plus Team" }],
  creator: "PikPak Plus Team",
  publisher: "PikPak Plus Team",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://pikpak-plus.com",
    title: "PikPak Plus - Web-based Clone of PikPak Service",
    description:
      "A web-based clone of the popular PikPak service that allows users to experience PikPak's features and functionality in a web environment for educational purposes.",
    siteName: "PikPak Plus",
    images: [
      {
        url: "/pikpak-plus.png",
        width: 1200,
        height: 630,
        alt: "PikPak Plus - Web-based Clone of PikPak Service",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PikPak Plus - Web-based Clone of PikPak Service",
    description:
      "A web-based clone of the popular PikPak service that allows users to experience PikPak's features and functionality in a web environment for educational purposes.",
    images: ["/pikpak-plus.png"],
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
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PikPak Plus",
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
