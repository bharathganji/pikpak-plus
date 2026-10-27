import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "lg";
  className?: string;
}

export function BrandLogo({ size = "sm", className }: Readonly<BrandLogoProps>) {
  const iconSize = size === "lg" ? 56 : 40;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/tordroid-plus-icon.svg"
        alt="Tordroid Plus"
        width={iconSize}
        height={iconSize}
        className="shrink-0"
        priority
      />
      <span
        className={cn(
          "font-bold tracking-tight bg-gradient-to-r from-blue-500 to-violet-600 bg-clip-text text-transparent",
          size === "lg" ? "text-3xl sm:text-4xl" : "hidden sm:inline text-2xl",
        )}
      >
        Tordroid Plus
      </span>
    </div>
  );
}
