import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FabProps {
  className?: string;
}

export function Fab({ className }: Readonly<FabProps> = {}) {
  return (
    <Button
      asChild
      size="lg"
      className={cn(
        "fixed bottom-8 right-8 z-50 shadow-lg hover:scale-105 transition-all gap-2",
        className,
      )}
    >
      <a
        href="https://jackett.pikpak-plus.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
        <span>Search Torrents</span>
      </a>
    </Button>
  );
}
