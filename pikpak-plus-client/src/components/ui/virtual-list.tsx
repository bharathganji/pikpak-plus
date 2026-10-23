"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface VirtualListProps<T> {
  items: readonly T[];
  itemHeight: number | ((index: number, item: T) => number);
  height?: number | string;
  overscan?: number;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
  className?: string;
  innerClassName?: string;
  emptyComponent?: ReactNode;
  onScroll?: (scrollTop: number) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * High-performance virtualized list (windowing) component for rendering large datasets
 * without DOM memory bloat or frame drops.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  height = 480,
  overscan = 5,
  renderItem,
  keyExtractor,
  className,
  innerClassName,
  emptyComponent,
  onScroll,
  scrollRef: externalScrollRef,
}: Readonly<VirtualListProps<T>>) {
  const internalRef = useRef<HTMLDivElement | null>(null);
  const containerRef = externalScrollRef || internalRef;
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [measuredHeight, setMeasuredHeight] = useState<number>(480);
  const containerHeight = typeof height === "number" ? height : measuredHeight;
  const rafIdRef = useRef<number | null>(null);

  // ResizeObserver to track container height if dynamic
  useEffect(() => {
    if (typeof height === "number") return;

    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setMeasuredHeight(entry.contentRect.height);
        }
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [containerRef, height]);

  // Handle scroll with requestAnimationFrame throttling for smooth 60fps scrolling
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const targetScrollTop = e.currentTarget.scrollTop;

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        setScrollTop(targetScrollTop);
        if (onScroll) {
          onScroll(targetScrollTop);
        }
      });
    },
    [onScroll]
  );

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const isFixed = typeof itemHeight === "number";

  // Pre-calculate positions for variable heights
  const { offsets, totalHeight } = useMemo(() => {
    if (isFixed) {
      const fixedH = itemHeight as number;
      return {
        offsets: null,
        totalHeight: items.length * fixedH,
      };
    }

    const getHeight = itemHeight as (index: number, item: T) => number;
    const computedOffsets = new Array<number>(items.length + 1);
    computedOffsets[0] = 0;

    for (let i = 0; i < items.length; i++) {
      computedOffsets[i + 1] = computedOffsets[i] + getHeight(i, items[i]);
    }

    return {
      offsets: computedOffsets,
      totalHeight: computedOffsets[items.length] || 0,
    };
  }, [items, itemHeight, isFixed]);

  // Calculate visible range
  const { startIndex, endIndex, topSpacerHeight, bottomSpacerHeight } = useMemo(() => {
    if (items.length === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      };
    }

    if (isFixed) {
      const fixedH = itemHeight as number;
      const start = Math.max(0, Math.floor(scrollTop / fixedH) - overscan);
      const visibleCount = Math.ceil(containerHeight / fixedH);
      const end = Math.min(items.length, start + visibleCount + overscan * 2);

      const topHeight = start * fixedH;
      const bottomHeight = Math.max(0, (items.length - end) * fixedH);

      return {
        startIndex: start,
        endIndex: end,
        topSpacerHeight: topHeight,
        bottomSpacerHeight: bottomHeight,
      };
    }

    // Binary search for variable heights
    const offsetArray = offsets || [];

    // Find start index
    let low = 0;
    let high = items.length - 1;
    let start = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (offsetArray[mid] <= scrollTop) {
        start = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    start = Math.max(0, start - overscan);

    // Find end index
    const targetBottom = scrollTop + containerHeight;
    low = start;
    high = items.length - 1;
    let end = items.length;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (offsetArray[mid] >= targetBottom) {
        end = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    end = Math.min(items.length, end + overscan);

    const topHeight = offsetArray[start] || 0;
    const bottomHeight = Math.max(0, totalHeight - (offsetArray[end] || totalHeight));

    return {
      startIndex: start,
      endIndex: end,
      topSpacerHeight: topHeight,
      bottomSpacerHeight: bottomHeight,
    };
  }, [items.length, isFixed, itemHeight, offsets, scrollTop, overscan, containerHeight, totalHeight]);

  if (items.length === 0 && emptyComponent) {
    return <>{emptyComponent}</>;
  }

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        "overflow-y-auto overflow-x-hidden relative scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40",
        className
      )}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
      }}
    >
      <div
        className={cn("w-full relative", innerClassName)}
        style={{ height: totalHeight }}
      >
        {/* Top spacer preserves scroll offset without rendering DOM elements */}
        {topSpacerHeight > 0 && (
          <div
            style={{ height: `${topSpacerHeight}px` }}
            aria-hidden="true"
          />
        )}

        {/* Windowed items */}
        {visibleItems.map((item, localIndex) => {
          const globalIndex = startIndex + localIndex;
          const key = keyExtractor
            ? keyExtractor(item, globalIndex)
            : globalIndex;

          return (
            <React.Fragment key={key}>
              {renderItem(item, globalIndex)}
            </React.Fragment>
          );
        })}

        {/* Bottom spacer preserves total scroll container dimensions */}
        {bottomSpacerHeight > 0 && (
          <div
            style={{ height: `${bottomSpacerHeight}px` }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
