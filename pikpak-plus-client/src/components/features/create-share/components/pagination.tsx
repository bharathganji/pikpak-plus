/**
 * Main pagination component
 */

import React, { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  generatePageNumbers,
  selectPaginationVariant,
  isValidPage,
  type PaginationVariant,
} from "../utils/pagination-utils";
import { PaginationButton } from "./pagination-button";

interface PaginationProps {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly onPageChange: (page: number) => void;
  readonly variant?: PaginationVariant;
  readonly showPageInfo?: boolean;
  readonly className?: string;
}

export const Pagination = React.memo(function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  variant = "full",
  showPageInfo = true,
  className = "",
}: Readonly<PaginationProps>) {
  const handlePageSelect = useMemo(() => {
    return (page: number) => {
      if (isValidPage(page, totalPages) && page !== currentPage) {
        onPageChange(page);
      }
    };
  }, [totalPages, currentPage, onPageChange]);

  const selectedVariant = useMemo(() => {
    return selectPaginationVariant(totalPages, variant);
  }, [totalPages, variant]);

  const pageNumbers = useMemo(() => {
    return generatePageNumbers(currentPage, totalPages);
  }, [currentPage, totalPages]);

  // Generate stable keys for ellipsis elements
  const generateEllipsisKey = useMemo(() => {
    return (position: "left" | "right", pageNum: number) => {
      return `ellipsis-${position}-${pageNum}-${totalPages}`;
    };
  }, [totalPages]);

  if (totalPages <= 1) {
    return null;
  }

  if (selectedVariant === "dropdown") {
    return (
      <div className={`flex items-center gap-2 justify-center ${className}`}>
        {showPageInfo && (
          <span className="text-xs text-muted-foreground mr-2">
            Page {currentPage} of {totalPages}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground text-xs font-medium"
            >
              {currentPage}
              <ChevronRight className="ml-1 h-3 w-3 rotate-90" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-48 overflow-y-auto">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <DropdownMenuItem
                key={page}
                onClick={() => handlePageSelect(page)}
                className={`cursor-pointer text-xs ${
                  page === currentPage
                    ? "bg-accent text-accent-foreground font-medium"
                    : ""
                }`}
              >
                Page {page}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Minimal variant - Only prev/next buttons
  if (selectedVariant === "minimal") {
    return (
      <div className={`flex items-center gap-2 justify-center ${className}`}>
        <PaginationButton
          currentPage={currentPage}
          onClick={() => handlePageSelect(currentPage - 1)}
          disabled={currentPage <= 1}
          variant="nav"
          ariaLabel="Previous page"
        >
          <ChevronLeft className="h-3 w-3 mr-1" />
          Prev
        </PaginationButton>

        <PaginationButton
          currentPage={currentPage}
          onClick={() => handlePageSelect(currentPage + 1)}
          disabled={currentPage >= totalPages}
          variant="nav"
          ariaLabel="Next page"
        >
          Next
          <ChevronRight className="h-3 w-3 ml-1" />
        </PaginationButton>
      </div>
    );
  }

  // Full variant - Complete pagination with page numbers
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Page info */}
      {showPageInfo && (
        <div className="text-xs text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
      )}

      {/* Navigation controls */}
      <div className="flex items-center gap-1 justify-center flex-wrap">
        {/* First page button */}
        <PaginationButton
          page={1}
          currentPage={currentPage}
          onClick={() => handlePageSelect(1)}
          disabled={currentPage <= 1}
          variant="nav"
          ariaLabel="First page"
        >
          <ChevronsLeft className="h-3 w-3" />
        </PaginationButton>

        {/* Previous page button */}
        <PaginationButton
          currentPage={currentPage}
          onClick={() => handlePageSelect(currentPage - 1)}
          disabled={currentPage <= 1}
          variant="nav"
          ariaLabel="Previous page"
        >
          <ChevronLeft className="h-3 w-3 mr-1" />
          Prev
        </PaginationButton>

        {/* Page number buttons */}
        {pageNumbers.map((pageNum, index) => {
          if (pageNum === "...") {
            return (
              <div
                key={generateEllipsisKey(
                  index === 0 ? "left" : "right",
                  pageNumbers[index - 1] as number,
                )}
                className="px-2 text-xs text-muted-foreground"
              >
                <MoreHorizontal className="h-3 w-3" />
              </div>
            );
          }

          const page = pageNum as number;
          return (
            <PaginationButton
              key={page}
              page={page}
              currentPage={currentPage}
              onClick={() => handlePageSelect(page)}
              variant="page"
              ariaLabel={`Go to page ${page}`}
            >
              {page}
            </PaginationButton>
          );
        })}

        {/* Next page button */}
        <PaginationButton
          currentPage={currentPage}
          onClick={() => handlePageSelect(currentPage + 1)}
          disabled={currentPage >= totalPages}
          variant="nav"
          ariaLabel="Next page"
        >
          Next
          <ChevronRight className="h-3 w-3 ml-1" />
        </PaginationButton>

        {/* Last page button */}
        <PaginationButton
          page={totalPages}
          currentPage={currentPage}
          onClick={() => handlePageSelect(totalPages)}
          disabled={currentPage >= totalPages}
          variant="nav"
          ariaLabel="Last page"
        >
          <ChevronsRight className="h-3 w-3" />
        </PaginationButton>
      </div>
    </div>
  );
});
