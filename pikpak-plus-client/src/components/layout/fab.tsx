import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Fab() {
  return (
    <Button
      asChild
      size="lg"
      className="fixed bottom-8 right-8 shadow-lg hover:scale-105 transition-all gap-2"
    >
      <a
        href="https://jackett.pikpak-plus.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Search className="h-5 w-5" />
        <span>Search Torrents</span>
      </a>
    </Button>
  );
}
