"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Search,
  LogIn,
  UserPlus,
  Send,
  Github,
} from "lucide-react";
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

export interface HeaderProps {
  isMaintenance?: boolean;
}

export function Header({ isMaintenance = false }: HeaderProps = {}) {
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";
  const isAuthPage =
    isLoginPage ||
    isRegisterPage ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  return (
    <header className="sticky top-0 z-50 w-full glass-header transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6 lg:px-8">
        {/* Brand identity & Status */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="PikPak Plus Home"
            className="inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg group touch-target min-h-[44px] min-w-[44px]"
          >
            {/* Desktop logo */}
            <Image
              src="/pikpak-plus.png"
              alt="PikPak Plus"
              width={200}
              height={50}
              className="hidden sm:block h-9 md:h-10 w-auto transition-transform duration-200 group-hover:scale-102"
              priority
            />
            {/* Mobile logo */}
            <Image
              src="/pikpak-plus-mobile.png"
              alt="PikPak Plus"
              width={40}
              height={40}
              className="block sm:hidden h-8 w-auto transition-transform duration-200 group-hover:scale-105"
              priority
            />
          </Link>

          {/* Unofficial / Plus indicator badge */}
          <div
            className={`hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
              isMaintenance
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                : "bg-primary/10 text-primary border border-primary/20"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isMaintenance
                  ? "bg-amber-500 animate-pulse"
                  : "bg-emerald-500 animate-pulse"
              }`}
            />
            <span>{isMaintenance ? "Maintenance Mode" : "Service Online"}</span>
          </div>
        </div>

        {/* Actions & Telemetry */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              <Link href="/dashboard" className="hidden sm:inline-flex">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 font-medium hover:bg-accent/80 transition-colors touch-target min-h-[44px]"
                >
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  <span>Dashboard</span>
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="User account menu"
                    className="rounded-full transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring touch-target"
                  >
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold border border-primary/25 shadow-xs ring-2 ring-primary/10 transition-colors hover:bg-primary/20">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 bg-popover/95 text-popover-foreground border border-border/80 shadow-2xl rounded-xl p-1.5 z-50 backdrop-blur-md"
                >
                  <DropdownMenuLabel className="font-normal px-2.5 py-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Account
                      </p>
                      <p className="text-sm font-medium leading-none text-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1 border-border/50" />
                  <Link href="/dashboard">
                    <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent focus:bg-accent">
                      <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
                      App Dashboard
                    </DropdownMenuItem>
                  </Link>
                  {isAdmin && (
                    <DropdownMenuItem
                      onClick={() => router.push("/admin")}
                      className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent focus:bg-accent"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4 text-emerald-500" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <Link href="/statistics">
                    <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent focus:bg-accent">
                      <BarChart className="mr-2 h-4 w-4 text-blue-500" />
                      System Statistics
                    </DropdownMenuItem>
                  </Link>
                  <a
                    href="https://jackett.pikpak-plus.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent focus:bg-accent">
                      <Search className="mr-2 h-4 w-4 text-amber-500" />
                      Search Torrents
                    </DropdownMenuItem>
                  </a>
                  <DropdownMenuSeparator className="my-1 border-border/50" />
                  <a
                    href="https://t.me/pikpak_plus"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent focus:bg-accent">
                      <Send className="mr-2 h-4 w-4 text-sky-500" />
                      Telegram Channel
                    </DropdownMenuItem>
                  </a>
                  <a
                    href="https://github.com/bharathganji/pikpak-plus"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent focus:bg-accent">
                      <Github className="mr-2 h-4 w-4" />
                      GitHub Repository
                    </DropdownMenuItem>
                  </a>
                  <DropdownMenuSeparator className="my-1 border-border/50" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="text-destructive focus:text-destructive cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-destructive/10 focus:bg-destructive/10"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {loggingOut ? "Logging out..." : "Log out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isLoginPage ? (
                <Link href="/register">
                  <Button
                    size="sm"
                    className="gap-1.5 font-medium shadow-xs hover:shadow-sm transition-shadow touch-target"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Sign Up</span>
                  </Button>
                </Link>
              ) : isRegisterPage || isAuthPage ? (
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 font-medium border-border/80 hover:bg-accent hover:text-foreground shadow-2xs transition-all touch-target"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 font-medium border-border/80 hover:bg-accent hover:text-foreground shadow-2xs transition-all touch-target"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Sign In</span>
                    </Button>
                  </Link>
                  <Link href="/register" className="hidden sm:inline-flex">
                    <Button
                      size="sm"
                      className="gap-1.5 font-medium shadow-xs hover:shadow-sm transition-shadow touch-target"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Sign Up</span>
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}

          {!isAuthPage && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden sm:inline-flex gap-1.5 text-xs sm:text-sm font-medium hover:bg-accent/80 transition-colors touch-target min-h-[44px]"
            >
              <a
                href="https://jackett.pikpak-plus.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Search Torrents (Jackett)"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="hidden md:inline">Search Torrents</span>
              </a>
            </Button>
          )}

          {!isAuthPage && (
            <Link href="/statistics" className="hidden md:inline-flex">
              <Button
                variant="ghost"
                size="icon"
                title="Statistics"
                aria-label="System Statistics"
                className="touch-target min-h-[44px] min-w-[44px]"
              >
                <BarChart className="h-[1.15rem] w-[1.15rem]" />
              </Button>
            </Link>
          )}

          <TelegramButton
            url="https://t.me/pikpak_plus"
            className={
              isAuthPage ? "hidden md:inline-flex" : "hidden sm:inline-flex"
            }
          />
          <GitHubButton
            repo="bharathganji/pikpak-plus"
            className={
              isAuthPage ? "hidden md:inline-flex" : "hidden sm:inline-flex"
            }
          />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
