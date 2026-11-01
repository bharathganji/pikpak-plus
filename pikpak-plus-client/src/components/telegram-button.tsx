import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface TelegramButtonProps {
  url: string;
  className?: string;
}

export function TelegramButton({
  url,
  className,
}: Readonly<TelegramButtonProps>) {
  return (
    <Button
      variant="outline"
      size="sm"
      asChild
      className={cn("gap-2 h-9", className)}
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
