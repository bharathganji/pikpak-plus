import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { GitHubButton } from "@/components/github-button";
import { TelegramButton } from "@/components/telegram-button";

export function Header() {
  return (
    <div className="w-full max-w-5xl flex items-center justify-between pb-4 pt-2">
      <div className="flex items-center">
        {/* Desktop logo */}
        <Image
          src="/pikpak-plus.png"
          alt="PikPak Plus"
          width={200}
          height={50}
          className="hidden sm:block h-12 w-auto transition-transform duration-200 hover:scale-105"
          priority
        />
        {/* Mobile logo */}
        <Image
          src="/pikpak-plus-mobile.png"
          alt="PikPak Plus"
          width={40}
          height={40}
          className="block sm:hidden h-10 w-auto transition-transform duration-200 hover:scale-105"
          priority
        />
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Link href="/statistics">
          <Button variant="ghost" size="icon" title="Statistics">
            <BarChart className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </Link>
        <TelegramButton url="https://t.me/pikpak_plus" />
        <GitHubButton repo="bharathganji/pikpak-plus" />
        <ModeToggle />
      </div>
    </div>
  );
}
