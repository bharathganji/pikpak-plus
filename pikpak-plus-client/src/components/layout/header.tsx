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

export function Header() {
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
    <header className="sticky top-0 z-50 w-full max-w-6xl flex items-center justify-between py-2.5 sm:py-3 px-3 sm:px-4 border-b border-border/60 bg-background/80 backdrop-blur-md transition-colors">
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
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 font-medium hover:bg-accent/80 transition-colors"
              >
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
              <DropdownMenuContent
                align="end"
                className="w-60 bg-popover text-popover-foreground border border-border/80 shadow-2xl rounded-xl p-1.5 z-50 backdrop-blur-none"
              >
                <DropdownMenuLabel className="font-normal px-2 py-1.5">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Account</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 border-border/50" />
                <Link href="/dashboard">
                  <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent/80 focus:bg-accent/80">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    App Dashboard
                  </DropdownMenuItem>
                </Link>
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => router.push("/admin")}
                    className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent/80 focus:bg-accent/80"
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <Link href="/statistics">
                  <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent/80 focus:bg-accent/80">
                    <BarChart className="mr-2 h-4 w-4" />
                    Statistics
                  </DropdownMenuItem>
                </Link>
                <a
                  href="https://jackett.pikpak-plus.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent/80 focus:bg-accent/80">
                    <Search className="mr-2 h-4 w-4" />
                    Search Torrents
                  </DropdownMenuItem>
                </a>
                <DropdownMenuSeparator className="my-1 border-border/50" />
                <a
                  href="https://t.me/pikpak_plus"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent/80 focus:bg-accent/80">
                    <Send className="mr-2 h-4 w-4" />
                    Telegram Channel
                  </DropdownMenuItem>
                </a>
                <a
                  href="https://github.com/bharathganji/pikpak-plus"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <DropdownMenuItem className="cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent/80 focus:bg-accent/80">
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
                  className="gap-1.5 font-medium shadow-xs hover:shadow-sm transition-shadow"
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
                  className="gap-1.5 font-medium border-border/80 hover:bg-accent/80 hover:text-foreground shadow-2xs transition-all"
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
                    className="gap-1.5 font-medium border-border/80 hover:bg-accent/80 hover:text-foreground shadow-2xs transition-all"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </Button>
                </Link>
                <Link href="/register" className="hidden sm:inline-flex">
                  <Button
                    size="sm"
                    className="gap-1.5 font-medium shadow-xs hover:shadow-sm transition-shadow"
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
            className="hidden sm:inline-flex gap-1.5 text-xs sm:text-sm font-medium hover:bg-accent/80 transition-colors"
          >
            <a
              href="https://jackett.pikpak-plus.com"
              target="_blank"
              rel="noopener noreferrer"
              title="Search Torrents (Jackett)"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">Search Torrents</span>
            </a>
          </Button>
        )}

        {!isAuthPage && (
          <Link href="/statistics" className="hidden md:inline-flex">
            <Button variant="ghost" size="icon" title="Statistics">
              <BarChart className="h-[1.2rem] w-[1.2rem]" />
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
    </header>
  );
}
