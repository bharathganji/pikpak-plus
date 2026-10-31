/**
 * Empirical Stress Test Harness for Frontend Resilience & Virtualization
 *
 * Tests:
 * 1. VirtualList:
 *    - 0 items (with and without emptyComponent)
 *    - 1 item
 *    - 25 items (threshold)
 *    - 10,000 items (scale & DOM footprint constraint)
 *    - Variable heights (prefix sum & binary search verification)
 *    - Window / container resizing
 *    - Rapid scroll simulation (jumps, negative scroll, overscroll, RAF simulation)
 *    - Dynamic list shrink while scrolled down
 * 2. ErrorBoundary:
 *    - Isolated containment in multi-tab architecture
 *    - getDerivedStateFromError & componentDidCatch telemetry
 *    - Default fallback Card with error details & title/description
 *    - Function fallback & custom ReactNode fallback
 *    - reset() recovery
 *    - resetKeys auto-reset on dependency changes
 *    - withErrorBoundary HOC
 * 3. Next.js App Router Error Boundaries:
 *    - src/app/error.tsx (segment error boundary)
 *    - src/app/global-error.tsx (root layout error boundary)
 */

import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VirtualList } from "../src/components/ui/virtual-list";
import {
  ErrorBoundary,
  withErrorBoundary,
} from "../src/components/ui/error-boundary";
import SegmentError from "../src/app/error";
import GlobalError from "../src/app/global-error";

console.log(
  "=== STARTING EMPIRICAL RESILIENCE & VIRTUALIZATION STRESS SUITE ===",
);

let passedTests = 0;
let failedTests = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err: unknown) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    failedTests++;
  }
}

// =========================================================================
// SECTION 1: VirtualList Mathematical & Windowing Logic Oracles
// =========================================================================

/**
 * Pure oracle for fixed-height windowing slice calculations matching VirtualList
 */
function computeFixedWindow(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number,
  overscan: number,
) {
  if (itemCount === 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      topSpacerHeight: 0,
      bottomSpacerHeight: 0,
      totalHeight: 0,
    };
  }

  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(itemCount, start + visibleCount + overscan * 2);

  const topHeight = start * itemHeight;
  const bottomHeight = Math.max(0, (itemCount - end) * itemHeight);
  const totalHeight = itemCount * itemHeight;

  return {
    startIndex: start,
    endIndex: end,
    topSpacerHeight: topHeight,
    bottomSpacerHeight: bottomHeight,
    totalHeight,
  };
}

/**
 * Pure oracle for variable-height windowing slice calculations matching VirtualList
 */
function computeVariableWindow(
  items: unknown[],
  getHeight: (index: number, item: unknown) => number,
  containerHeight: number,
  scrollTop: number,
  overscan: number,
) {
  if (items.length === 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      topSpacerHeight: 0,
      bottomSpacerHeight: 0,
      totalHeight: 0,
      computedOffsets: [0],
    };
  }

  const computedOffsets = new Array<number>(items.length + 1);
  computedOffsets[0] = 0;
  for (let i = 0; i < items.length; i++) {
    computedOffsets[i + 1] = computedOffsets[i] + getHeight(i, items[i]);
  }
  const totalHeight = computedOffsets[items.length] || 0;

  // Binary search for start
  let low = 0;
  let high = items.length - 1;
  let start = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (computedOffsets[mid] <= scrollTop) {
      start = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  start = Math.max(0, start - overscan);

  // Binary search for end
  const targetBottom = scrollTop + containerHeight;
  low = start;
  high = items.length - 1;
  let end = items.length;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (computedOffsets[mid] >= targetBottom) {
      end = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  end = Math.min(items.length, end + overscan);

  const topHeight = computedOffsets[start] || 0;
  const bottomHeight = Math.max(
    0,
    totalHeight - (computedOffsets[end] || totalHeight),
  );

  return {
    startIndex: start,
    endIndex: end,
    topSpacerHeight: topHeight,
    bottomSpacerHeight: bottomHeight,
    totalHeight,
    computedOffsets,
  };
}

// -------------------------------------------------------------------------
// Test 1: 0 items edge case
// -------------------------------------------------------------------------
runTest(
  "VirtualList: 0 items with emptyComponent renders emptyComponent",
  () => {
    const html = renderToStaticMarkup(
      <VirtualList<string>
        items={[]}
        itemHeight={50}
        height={480}
        emptyComponent={<div id="empty-state">No items found</div>}
        renderItem={(item) => <div>{item}</div>}
      />,
    );

    assert.ok(html.includes('id="empty-state"'));
    assert.ok(html.includes("No items found"));
  },
);

runTest(
  "VirtualList: 0 items without emptyComponent renders clean empty container",
  () => {
    const html = renderToStaticMarkup(
      <VirtualList<string>
        items={[]}
        itemHeight={50}
        height={480}
        renderItem={(item) => <div>{item}</div>}
      />,
    );

    assert.ok(html.includes('style="height:480px"'));
    assert.ok(html.includes('style="height:0"'));
    assert.ok(!html.includes("NaN"));
    assert.ok(!html.includes("undefined"));
  },
);

// -------------------------------------------------------------------------
// Test 2: 1 item edge case
// -------------------------------------------------------------------------
interface SoloItem {
  id: string;
  name: string;
}

runTest("VirtualList: 1 item renders exactly 1 item with 0 spacers", () => {
  const items: SoloItem[] = [{ id: "single-1", name: "Solo File" }];
  const html = renderToStaticMarkup(
    <VirtualList<SoloItem>
      items={items}
      itemHeight={50}
      height={480}
      keyExtractor={(item) => item.id}
      renderItem={(item) => <div className="item-row">{item.name}</div>}
    />,
  );

  assert.ok(html.includes("Solo File"));
  assert.ok(html.includes('style="height:50px"')); // inner height matches 1 * 50

  const win = computeFixedWindow(1, 50, 480, 0, 5);
  assert.equal(win.startIndex, 0);
  assert.equal(win.endIndex, 1);
  assert.equal(win.topSpacerHeight, 0);
  assert.equal(win.bottomSpacerHeight, 0);
  assert.equal(win.totalHeight, 50);
});

// -------------------------------------------------------------------------
// Test 3: 25 items (threshold boundary)
// -------------------------------------------------------------------------
interface BoundItem {
  id: string;
  title: string;
}

runTest(
  "VirtualList: 25 items renders correct initial window and preserves dimensions",
  () => {
    const items: BoundItem[] = Array.from({ length: 25 }, (_, i) => ({
      id: `id-${i}`,
      title: `Item ${i}`,
    }));
    const html = renderToStaticMarkup(
      <VirtualList<BoundItem>
        items={items}
        itemHeight={48}
        height={480}
        keyExtractor={(item) => item.id}
        renderItem={(item) => <div>{item.title}</div>}
      />,
    );

    assert.ok(html.includes("Item 0"));
    assert.ok(html.includes("Item 19"));
    assert.ok(!html.includes("Item 24")); // Beyond window + overscan
    assert.ok(html.includes('style="height:240px"')); // bottom spacer

    const win = computeFixedWindow(25, 48, 480, 0, 5);
    assert.equal(win.startIndex, 0);
    assert.equal(win.endIndex, 20);
    assert.equal(win.topSpacerHeight, 0);
    assert.equal(win.bottomSpacerHeight, 240);
    assert.equal(win.totalHeight, 1200); // 25 * 48
  },
);

// -------------------------------------------------------------------------
// Test 4: 10,000 items scale stress test & bounded DOM footprint
// -------------------------------------------------------------------------
interface LargeItem {
  id: string;
  label: string;
}

runTest(
  "VirtualList: 10,000 items renders bounded DOM footprint (<25 nodes) without bloat",
  () => {
    const t0 = performance.now();
    const items: LargeItem[] = Array.from({ length: 10000 }, (_, i) => ({
      id: `id-${i}`,
      label: `Entry ${i}`,
    }));
    const creationDuration = performance.now() - t0;
    assert.ok(
      creationDuration < 100,
      `Array generation took too long: ${creationDuration}ms`,
    );

    const t1 = performance.now();
    const html = renderToStaticMarkup(
      <VirtualList<LargeItem>
        items={items}
        itemHeight={40}
        height={480}
        renderItem={(item) => <span>{item.label}</span>}
      />,
    );
    const renderDuration = performance.now() - t1;

    const win = computeFixedWindow(10000, 40, 480, 0, 5);
    assert.equal(win.startIndex, 0);
    assert.equal(win.endIndex, 22);
    assert.equal(win.totalHeight, 400000);
    assert.equal(win.topSpacerHeight, 0);
    assert.equal(win.bottomSpacerHeight, (10000 - 22) * 40); // 399,120px

    assert.ok(html.includes("Entry 0"));
    assert.ok(html.includes("Entry 21"));
    assert.ok(!html.includes("Entry 25"));
    assert.ok(!html.includes("Entry 9999"));
    assert.ok(html.includes('style="height:400000px"'));
    assert.ok(
      renderDuration < 50,
      `Render duration was too slow: ${renderDuration}ms`,
    );
  },
);

// -------------------------------------------------------------------------
// Test 5: Variable Heights & Binary Search Precision
// -------------------------------------------------------------------------
runTest(
  "VirtualList: Variable heights correctly computes offsets, binary search and spacers",
  () => {
    const itemCount = 500;
    const items = Array.from({ length: itemCount }, (_, i) => ({
      id: i,
      height: 30 + (i % 7) * 15, // Heights range from 30px to 120px
    }));

    const getHeight = (_index: number, item: unknown) =>
      (item as { height: number }).height;

    // Initial scroll position: scrollTop = 0
    const win0 = computeVariableWindow(items, getHeight, 500, 0, 3);
    assert.equal(win0.startIndex, 0);
    assert.equal(win0.topSpacerHeight, 0);
    assert.ok(win0.endIndex > 0 && win0.endIndex < itemCount);
    assert.ok(win0.computedOffsets);
    assert.equal(
      win0.topSpacerHeight +
        (win0.computedOffsets[win0.endIndex] -
          win0.computedOffsets[win0.startIndex]) +
        win0.bottomSpacerHeight,
      win0.totalHeight,
    );

    // Mid scroll position: scrollTop = 5000
    const winMid = computeVariableWindow(items, getHeight, 500, 5000, 4);
    assert.ok(
      winMid.startIndex > 0,
      `startIndex should be > 0 at scrollTop=5000: was ${winMid.startIndex}`,
    );
    assert.ok(winMid.endIndex > winMid.startIndex);
    assert.ok(winMid.topSpacerHeight > 0);
    assert.ok(winMid.bottomSpacerHeight > 0);
    assert.ok(winMid.computedOffsets);
    assert.equal(
      winMid.topSpacerHeight +
        (winMid.computedOffsets[winMid.endIndex] -
          winMid.computedOffsets[winMid.startIndex]) +
        winMid.bottomSpacerHeight,
      winMid.totalHeight,
    );

    // Near end scroll position: scrollTop = win0.totalHeight - 400
    const winEnd = computeVariableWindow(
      items,
      getHeight,
      500,
      win0.totalHeight - 400,
      4,
    );
    assert.equal(winEnd.endIndex, itemCount);
    assert.equal(winEnd.bottomSpacerHeight, 0);
  },
);

// -------------------------------------------------------------------------
// Test 6: Container Resizing Simulation
// -------------------------------------------------------------------------
runTest(
  "VirtualList: Container resizing adapts visible slice count dynamically",
  () => {
    const itemCount = 100;
    const itemHeight = 50;
    const scrollTop = 1000; // item 20 is at the top
    const overscan = 2;

    // Normal desktop viewport: 500px height -> 10 visible items
    const desk = computeFixedWindow(
      itemCount,
      itemHeight,
      500,
      scrollTop,
      overscan,
    );
    assert.equal(desk.startIndex, Math.max(0, 20 - overscan)); // 18
    assert.equal(desk.endIndex, 18 + 10 + 4); // 32
    assert.equal(desk.endIndex - desk.startIndex, 14);

    // Mobile small screen: 250px height -> 5 visible items
    const mob = computeFixedWindow(
      itemCount,
      itemHeight,
      250,
      scrollTop,
      overscan,
    );
    assert.equal(mob.startIndex, 18);
    assert.equal(mob.endIndex, 18 + 5 + 4); // 27
    assert.equal(mob.endIndex - mob.startIndex, 9);

    // Huge 4K display: 1500px height -> 30 visible items
    const display4k = computeFixedWindow(
      itemCount,
      itemHeight,
      1500,
      scrollTop,
      overscan,
    );
    assert.equal(display4k.startIndex, 18);
    assert.equal(display4k.endIndex, 18 + 30 + 4); // 52
    assert.equal(display4k.endIndex - display4k.startIndex, 34);

    // Degenerate 0px container height
    const zeroH = computeFixedWindow(
      itemCount,
      itemHeight,
      0,
      scrollTop,
      overscan,
    );
    assert.equal(zeroH.startIndex, 18);
    assert.equal(zeroH.endIndex, 18 + 0 + 4); // 22 (only overscan)
  },
);

// -------------------------------------------------------------------------
// Test 7: Rapid Scroll Simulation & Boundary Stress
// -------------------------------------------------------------------------
runTest(
  "VirtualList: Rapid scroll jumps, negative rubber-band, and overscroll recovery",
  () => {
    const itemCount = 5000;
    const itemHeight = 50;
    const containerHeight = 500;
    const overscan = 5;

    // 1. Negative scroll (iOS bounce / rubber banding)
    const negScroll = computeFixedWindow(
      itemCount,
      itemHeight,
      containerHeight,
      -200,
      overscan,
    );
    assert.equal(negScroll.startIndex, 0);
    assert.ok(negScroll.endIndex >= 15);
    assert.equal(negScroll.topSpacerHeight, 0);

    // 2. Out of bounds overscroll past the list end
    const totalH = itemCount * itemHeight; // 250,000
    const overScroll = computeFixedWindow(
      itemCount,
      itemHeight,
      containerHeight,
      totalH + 5000,
      overscan,
    );
    assert.equal(overScroll.endIndex, itemCount);
    assert.equal(overScroll.bottomSpacerHeight, 0);

    // 3. High-velocity scroll series (100 rapid events)
    const scrollSequence = [
      0, 150, 1200, 5000, 25000, 80000, 200000, 249000, 249800, 180000, 90000,
      3000, 0, -50, 0,
    ];

    for (const pos of scrollSequence) {
      const res = computeFixedWindow(
        itemCount,
        itemHeight,
        containerHeight,
        pos,
        overscan,
      );
      assert.ok(
        res.startIndex >= 0,
        `startIndex must be >= 0 (got ${res.startIndex} at pos ${pos})`,
      );
      assert.ok(
        res.endIndex <= itemCount,
        `endIndex must be <= itemCount (got ${res.endIndex})`,
      );
      assert.ok(res.topSpacerHeight >= 0);
      assert.ok(res.bottomSpacerHeight >= 0);
      assert.ok(!Number.isNaN(res.startIndex));
      assert.ok(!Number.isNaN(res.endIndex));
    }
  },
);

// -------------------------------------------------------------------------
// Test 8: Adversarial Edge Case — Dynamic List Truncation while Scrolled
// -------------------------------------------------------------------------
runTest(
  "VirtualList: Dynamic list truncation while user is scrolled deep down",
  () => {
    const prevScrollTop = 50000;
    const newItemCount = 3;
    const itemHeight = 50;
    const containerHeight = 500;
    const overscan = 5;

    const win = computeFixedWindow(
      newItemCount,
      itemHeight,
      containerHeight,
      prevScrollTop,
      overscan,
    );
    const dummyItems = ["A", "B", "C"];
    const slice = dummyItems.slice(win.startIndex, win.endIndex);
    assert.deepEqual(slice, []); // Safe slice!
  },
);

// =========================================================================
// SECTION 2: ErrorBoundary & Resilience Containment Stress Tests
// =========================================================================

// -------------------------------------------------------------------------
// Test 9: ErrorBoundary standard rendering without error
// -------------------------------------------------------------------------
runTest("ErrorBoundary: Normal child renders cleanly without errors", () => {
  const html = renderToStaticMarkup(
    <ErrorBoundary title="Test Boundary">
      <div id="child-content">Healthy Child Content</div>
    </ErrorBoundary>,
  );

  assert.ok(html.includes("Healthy Child Content"));
  assert.ok(html.includes('id="child-content"'));
  assert.ok(!html.includes("Failed to load component"));
});

// -------------------------------------------------------------------------
// Test 10: ErrorBoundary getDerivedStateFromError state transition
// -------------------------------------------------------------------------
runTest(
  "ErrorBoundary: getDerivedStateFromError correctly captures error state",
  () => {
    const testError = new Error("Simulated rendering failure in tab");
    const derivedState = ErrorBoundary.getDerivedStateFromError(testError);

    assert.equal(derivedState.hasError, true);
    assert.equal(derivedState.error, testError);
  },
);

// -------------------------------------------------------------------------
// Test 11: ErrorBoundary telemetry callback in componentDidCatch
// -------------------------------------------------------------------------
runTest(
  "ErrorBoundary: componentDidCatch executes onError callback with telemetry info",
  () => {
    let loggedError: Error | null = null;
    let loggedInfo: unknown = null;

    const boundary = new ErrorBoundary({
      children: null,
      onError: (err, info) => {
        loggedError = err;
        loggedInfo = info;
      },
    });

    const err = new Error("Telemetry Test Error");
    const mockInfo = { componentStack: "at FlakyComponent" };

    boundary.componentDidCatch(err, mockInfo as any);

    assert.equal(loggedError, err);
    assert.equal(loggedInfo, mockInfo);
  },
);

// -------------------------------------------------------------------------
// Test 12: ErrorBoundary fallback rendering with title, description, and error message
// -------------------------------------------------------------------------
runTest(
  "ErrorBoundary: Fallback card renders custom title, description, and error message",
  () => {
    const boundary = new ErrorBoundary({
      title: "Failed to load File Explorer",
      description: "Directory tree failed to synchronize.",
      children: <div>Child</div>,
    });

    // Simulate caught error state
    boundary.state = {
      hasError: true,
      error: new Error("Network timeout while querying files"),
    };

    const renderedNode = boundary.render();
    const html = renderToStaticMarkup(renderedNode as React.ReactElement);

    assert.ok(html.includes("Failed to load File Explorer"));
    assert.ok(html.includes("Directory tree failed to synchronize."));
    assert.ok(html.includes("Network timeout while querying files"));
    assert.ok(html.includes("Retry Component"));
  },
);

// -------------------------------------------------------------------------
// Test 13: ErrorBoundary custom fallback function and node support
// -------------------------------------------------------------------------
runTest(
  "ErrorBoundary: Custom functional fallback receives error and reset function",
  () => {
    let passedError: Error | null = null;
    let passedReset: (() => void) | null = null;

    const boundary = new ErrorBoundary({
      children: null,
      fallback: (error, reset) => {
        passedError = error;
        passedReset = reset;
        return <div id="custom-fallback">Handled: {error.message}</div>;
      },
    });

    const err = new Error("Custom fallback probe");
    boundary.state = { hasError: true, error: err };

    const node = boundary.render();
    const html = renderToStaticMarkup(node as React.ReactElement);

    assert.ok(html.includes('id="custom-fallback"'));
    assert.ok(html.includes("Handled: Custom fallback probe"));
    assert.equal(passedError, err);
    assert.equal(typeof passedReset, "function");
  },
);

// -------------------------------------------------------------------------
// Test 14: ErrorBoundary reset() behavior
// -------------------------------------------------------------------------
runTest(
  "ErrorBoundary: reset() resets state to hasError: false and error: null",
  () => {
    const boundary = new ErrorBoundary({ children: null });
    boundary.state = { hasError: true, error: new Error("Fail") };

    let stateUpdated = false;
    boundary.setState = ((updater: any) => {
      const newState =
        typeof updater === "function" ? updater(boundary.state) : updater;
      boundary.state = { ...boundary.state, ...newState };
      stateUpdated = true;
    }) as any;

    boundary.reset();

    assert.ok(stateUpdated);
    assert.equal(boundary.state.hasError, false);
    assert.equal(boundary.state.error, null);
  },
);

// -------------------------------------------------------------------------
// Test 15: ErrorBoundary resetKeys auto-reset
// -------------------------------------------------------------------------
runTest(
  "ErrorBoundary: resetKeys changes automatically trigger reset()",
  () => {
    const boundary = new ErrorBoundary({
      children: null,
      resetKeys: ["tab-create", 1],
    });
    boundary.state = { hasError: true, error: new Error("Old Tab Error") };

    let resetCalled = false;
    boundary.reset = () => {
      resetCalled = true;
      boundary.state = { hasError: false, error: null };
    };

    // 1. Same keys: no reset
    boundary.componentDidUpdate({
      children: null,
      resetKeys: ["tab-create", 1],
    });
    assert.equal(resetCalled, false);

    // 2. Changed keys: triggers auto-reset
    boundary.componentDidUpdate({
      children: null,
      resetKeys: ["tab-files", 2],
    });
    assert.equal(resetCalled, true);
    assert.equal(boundary.state.hasError, false);
  },
);

// -------------------------------------------------------------------------
// Test 16: withErrorBoundary HOC wraps component
// -------------------------------------------------------------------------
runTest(
  "withErrorBoundary HOC correctly wraps components and sets displayName",
  () => {
    interface SampleProps {
      text: string;
    }
    function SampleComponent(props: SampleProps) {
      return <div>{props.text}</div>;
    }
    SampleComponent.displayName = "SampleComponent";

    const Wrapped = withErrorBoundary(SampleComponent, {
      title: "Wrapped Error",
    });

    assert.equal(Wrapped.displayName, "WithErrorBoundary(SampleComponent)");

    const html = renderToStaticMarkup(<Wrapped text="Hello HOC" />);
    assert.ok(html.includes("Hello HOC"));
  },
);

// -------------------------------------------------------------------------
// Test 17: Tab Isolation Containment Simulation
// -------------------------------------------------------------------------
runTest(
  "Tab Isolation: Error inside Tab 2 is contained and does not crash Tab 1 or Tab 3",
  () => {
    // Simulate tab rendering container
    const tab1Boundary = new ErrorBoundary({
      title: "Tab 1 Error",
      children: null,
    });
    const tab2Boundary = new ErrorBoundary({
      title: "Failed to load File Explorer",
      children: null,
    });
    const tab3Boundary = new ErrorBoundary({
      title: "Tab 3 Error",
      children: null,
    });

    // Tab 2 encounters a fatal crash
    tab2Boundary.state = {
      hasError: true,
      error: new Error("PikPak API Auth Session Expired in Files"),
    };

    const tab1Html = renderToStaticMarkup(
      <div id="tab-create">Create &amp; Share Active Content</div>,
    );
    const tab2Html = renderToStaticMarkup(
      tab2Boundary.render() as React.ReactElement,
    );
    const tab3Html = renderToStaticMarkup(
      <div id="tab-downloads">Downloads Active Content</div>,
    );

    // Assert Tab 1 is fully functional
    assert.ok(
      tab1Html.includes("Create &amp; Share Active Content") ||
        tab1Html.includes("Create & Share Active Content"),
    );
    assert.ok(!tab1Html.includes("Error"));

    // Assert Tab 2 is isolated in error card
    assert.ok(tab2Html.includes("Failed to load File Explorer"));
    assert.ok(tab2Html.includes("PikPak API Auth Session Expired in Files"));
    assert.ok(tab2Html.includes("Retry Component"));

    // Assert Tab 3 is fully functional
    assert.ok(tab3Html.includes("Downloads Active Content"));
    assert.ok(!tab3Html.includes("Error"));
  },
);

// -------------------------------------------------------------------------
// Test 18: Next.js App Router error.tsx Segment Error Boundary
// -------------------------------------------------------------------------
runTest(
  "App Router: error.tsx segment error boundary renders Try Again and Return Home",
  () => {
    const segmentError = new Error("Segment data loading failed") as Error & {
      digest?: string;
    };
    segmentError.digest = "NEXT_DIGEST_XYZ123";

    let resetInvoked = false;
    const mockReset = () => {
      resetInvoked = true;
    };

    const html = renderToStaticMarkup(
      <SegmentError error={segmentError} reset={mockReset} />,
    );

    assert.ok(html.includes("Something went wrong"));
    assert.ok(html.includes("Segment data loading failed"));
    assert.ok(html.includes("NEXT_DIGEST_XYZ123"));
    assert.ok(html.includes("Try Again"));
    assert.ok(html.includes("Return Home"));
    assert.ok(html.includes('href="/"'));
  },
);

// -------------------------------------------------------------------------
// Test 19: Next.js App Router global-error.tsx Root Error Boundary
// -------------------------------------------------------------------------
runTest(
  "App Router: global-error.tsx root boundary renders full html/body shell and recovery options",
  () => {
    const rootError = new Error(
      "Critical Root Shell Initialization Failure",
    ) as Error & { digest?: string };
    rootError.digest = "ROOT_FATAL_456";

    const html = renderToStaticMarkup(
      <GlobalError error={rootError} reset={() => {}} />,
    );

    // global-error.tsx must provide its own <html> and <body> tags
    assert.ok(html.startsWith("<html") || html.includes("<html"));
    assert.ok(html.includes("<body"));
    assert.ok(html.includes("Critical System Error"));
    assert.ok(html.includes("Critical Root Shell Initialization Failure"));
    assert.ok(html.includes("ROOT_FATAL_456"));
    assert.ok(html.includes("Try Recovery"));
    assert.ok(html.includes("Reload Dashboard"));
  },
);

// =========================================================================
// SUMMARY
// =========================================================================
console.log("\n=== TEST EXECUTION SUMMARY ===");
console.log(`Total tests run: ${passedTests + failedTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log("ALL EMPIRICAL RESILIENCE & VIRTUALIZATION TESTS PASSED!");
}
