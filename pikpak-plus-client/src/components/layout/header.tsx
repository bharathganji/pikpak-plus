import Image from "next/image";
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
          className="hidden sm:block h-12 w-auto"
          priority
        />
        {/* Mobile logo */}
        <Image
          src="/pikpak-plus-mobile.png"
          alt="PikPak Plus"
          width={40}
          height={40}
          className="block sm:hidden h-10 w-auto"
          priority
        />
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <TelegramButton url="https://t.me/pikpak_plus" />
        <GitHubButton repo="bharathganji/pikpak-plus" />
        <ModeToggle />
      </div>
    </div>
  );
}
