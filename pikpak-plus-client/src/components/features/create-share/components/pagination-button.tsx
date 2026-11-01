/**
 * Pagination button component with pill-style design
 */

import React from "react";
import { Button } from "@/components/ui/button";

// Button variant types for pagination
type ButtonVariant = "page" | "nav";

interface PaginationButtonProps {
  readonly page?: number;
  readonly currentPage: number;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly children: React.ReactNode;
  readonly variant?: ButtonVariant;
  readonly ariaLabel?: string;
}

export const PaginationButton = React.memo(function PaginationButton({
  page,
  currentPage,
  onClick,
  disabled = false,
  children,
  variant = "page",
  ariaLabel,
}: Readonly<PaginationButtonProps>) {
  const isActive = page === currentPage;
  const baseClasses =
    "h-8 px-3 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40";

  const pageClasses = isActive
    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs font-semibold border-primary ring-1 ring-primary/20"
    : "bg-card hover:bg-accent hover:text-accent-foreground border border-border/60 hover:border-border";

  const navClasses =
    "bg-card hover:bg-accent hover:text-accent-foreground border border-border/60 hover:border-primary/40 shadow-xs";

  const classes = `${baseClasses} ${
    variant === "page" ? pageClasses : navClasses
  } rounded-full text-xs font-medium`;

  return (
    <Button
      variant="outline"
      size="sm"
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  );
});
