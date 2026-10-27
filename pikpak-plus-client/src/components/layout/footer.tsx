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
          Tordroid Plus is private and for family only. Built on the
          open-source PikPak Plus project (GPL-3.0).
        </p>
      </div>
    </footer>
  );
}
