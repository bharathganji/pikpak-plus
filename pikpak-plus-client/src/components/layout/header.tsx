"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BarChart, LogOut, LayoutDashboard } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { GitHubButton } from "@/components/github-button";
import { TelegramButton } from "@/components/telegram-button";
import { useAuth } from "@/components/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

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
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium border border-primary/20">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Account</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => router.push("/admin")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Admin Dashboard
                </DropdownMenuItem>
              )}
              <Link href="/statistics">
                <DropdownMenuItem>
                  <BarChart className="mr-2 h-4 w-4" />
                  Statistics
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!user && (
          <Link href="/statistics">
            <Button variant="ghost" size="icon" title="Statistics">
              <BarChart className="h-[1.2rem] w-[1.2rem]" />
            </Button>
          </Link>
        )}

        <TelegramButton url="https://t.me/pikpak_plus" />
        <GitHubButton repo="bharathganji/pikpak-plus" />
        <ModeToggle />
      </div>
    </div>
  );
}
