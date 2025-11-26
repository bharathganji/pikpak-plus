import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full max-w-6xl mt-12 mb-6 text-center text-sm text-muted-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-4 mb-2">
          <Link
            href="/faq"
            className="text-muted-foreground hover:text-primary hover:underline transition-colors"
          >
            FAQ
          </Link>
          <a
            href="https://github.com/bharathganji/pikpak-plus"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary hover:underline transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://t.me/pikpak_plus"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary hover:underline transition-colors"
          >
            Telegram
          </a>
        </div>
        <p className="flex items-center gap-1 flex-wrap justify-center">
          File information powered by{" "}
          <a
            href="https://whatslink.info"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
          >
            whatslink.info
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
        <p className="text-xs max-w-md">
          As a free public welfare project, please refrain from abuse.
        </p>
      </div>
    </footer>
  );
}
