import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface TelegramButtonProps {
  url: string;
}

export function TelegramButton({ url }: TelegramButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      asChild
      className="gap-2 h-9"
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Join Telegram Channel"
      >
        <Send className="h-4 w-4" />
        <span className="text-xs font-medium">Telegram</span>
      </a>
    </Button>
  );
}

