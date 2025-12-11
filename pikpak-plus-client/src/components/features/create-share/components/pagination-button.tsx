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
    "h-8 px-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const pageClasses = isActive
    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-medium"
    : "bg-background hover:bg-accent hover:text-accent-foreground border border-input";

  const navClasses =
    "bg-background hover:bg-accent hover:text-accent-foreground border border-input hover:border-accent-foreground/20";

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
