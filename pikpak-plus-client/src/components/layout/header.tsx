"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BarChart, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";
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

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full max-w-6xl flex items-center justify-between pb-4 pt-2 px-2 sm:px-4 border-b border-border/60 bg-background/80 backdrop-blur-md transition-colors">
      <Link href="/" className="flex items-center focus:outline-hidden group">
        {/* Desktop logo */}
        <Image
          src="/pikpak-plus.png"
          alt="PikPak Plus"
          width={200}
          height={50}
          className="hidden sm:block h-10 md:h-12 w-auto transition-transform duration-200 group-hover:scale-105"
          priority
        />
        {/* Mobile logo */}
        <Image
          src="/pikpak-plus-mobile.png"
          alt="PikPak Plus"
          width={40}
          height={40}
          className="block sm:hidden h-9 w-auto transition-transform duration-200 group-hover:scale-105"
          priority
        />
      </Link>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {user ? (
          <>
            <Link href="/dashboard" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm" className="gap-1.5 font-medium hover:bg-accent/80 transition-colors">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium border border-primary/20 shadow-xs ring-1 ring-primary/10 transition-colors hover:bg-primary/15">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-card shadow-lg border border-border/60">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Account</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/dashboard">
                  <DropdownMenuItem className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    App Dashboard
                  </DropdownMenuItem>
                </Link>
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => router.push("/admin")}
                    className="cursor-pointer"
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <Link href="/statistics">
                  <DropdownMenuItem className="cursor-pointer">
                    <BarChart className="mr-2 h-4 w-4" />
                    Statistics
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {loggingOut ? "Logging out..." : "Log out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="hidden xs:inline-flex shadow-xs hover:shadow-sm transition-shadow">
                Sign Up
              </Button>
            </Link>
          </div>
        )}

        <Link href="/statistics" className="hidden md:inline-flex">
          <Button variant="ghost" size="icon" title="Statistics">
            <BarChart className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </Link>

        <TelegramButton url="https://t.me/pikpak_plus" />
        <GitHubButton repo="bharathganji/pikpak-plus" />
        <ModeToggle />
      </div>
    </header>
  );
}
