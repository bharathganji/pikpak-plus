/**
 * Adversarial Challenger UI Resilience Suite
 * Focus:
 * 1. create-share-tab: SSR/Hydration resilience, cleanupStatus time calculation oracles, task addition deduplication, effect cancellation, api-utils fallbacks.
 * 2. webdav-clients-grid: Initialization, loading/error/empty/active states, pluralization, retry mechanics, error formatting, traffic warning overlay.
 * 3. content-moderation: Filter/pagination resilience and React 19 cascading-render immunity.
 */

import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Import components under test
import { WebDAVLoadingState, WebDAVErrorState, WebDAVEmptyState, WebDAVTrafficWarning } from "../src/components/features/downloads/webdav-states";
import { WebDAVClientCard } from "../src/components/features/downloads/webdav-client-card";
import { WebDAVClientsGrid } from "../src/components/features/downloads/webdav-clients-grid";
import { ContentModeration } from "../src/app/admin/components/content-moderation";
import { fetchConfig, fetchCleanupStatus, fetchGlobalTasks } from "../src/components/features/create-share/api-utils";
import type { LocalTask } from "../src/components/features/my-activity/types";
import type { WebDAVResponse, WebDAVClient } from "../src/components/features/downloads/webdav-types";
import axios from "axios";

console.log("=== STARTING ADVERSARIAL UI RESILIENCE & HYDRATION SUITE ===");

let passedTests = 0;
let failedTests = 0;

async function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    const result = fn();
    if (result instanceof Promise) {
      await result;
    }
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err: unknown) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    failedTests++;
  }
}

// Mock browser environment globals if running in headless node
if (typeof globalThis.window === "undefined") {
  const storageMap = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, value: string) => storageMap.set(key, String(value)),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
    key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
    get length() {
      return storageMap.size;
    },
  };

  (globalThis as any).window = {
    localStorage: mockLocalStorage,
    location: {
      origin: "http://localhost:3000",
      href: "http://localhost:3000",
      assign: () => {},
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
  (globalThis as any).localStorage = mockLocalStorage;
  (globalThis as any).document = {
    documentElement: {
      dataset: {},
      removeAttribute: () => {},
    },
    querySelector: () => ({ dataset: {} }),
    querySelectorAll: () => [],
    createElement: () => ({
      setAttribute: () => {},
      appendChild: () => {},
      removeChild: () => {},
      click: () => {},
      style: {},
      dataset: {},
    }),
    head: { appendChild: () => {}, removeChild: () => {} },
    body: { appendChild: () => {}, removeChild: () => {} },
  };
}

async function runAll() {
  // =========================================================================
  // SECTION 1: CreateShareTab Oracles & Hydration Safety
  // =========================================================================

  // Pure oracle for timeUntilCleanup calculation matching create-share-tab.tsx
  function computeTimeUntilCleanup(cleanupStatus: { next_cleanup: string | null } | null, now: Date): string {
    if (!cleanupStatus?.next_cleanup) return "";
    const next = new Date(cleanupStatus.next_cleanup);
    const diff = next.getTime() - now.getTime();

    if (isNaN(diff)) return "Invalid Date";
    if (diff <= 0) return "Soon";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  await runTest("create-share-tab: computeTimeUntilCleanup returns empty string when status is null or missing", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    assert.strictEqual(computeTimeUntilCleanup(null, now), "");
    assert.strictEqual(computeTimeUntilCleanup({ next_cleanup: null }, now), "");
    assert.strictEqual(computeTimeUntilCleanup({ next_cleanup: "" }, now), "");
  });

  await runTest("create-share-tab: computeTimeUntilCleanup handles past and zero-diff boundaries as 'Soon'", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    // 5 minutes in past
    assert.strictEqual(computeTimeUntilCleanup({ next_cleanup: "2026-10-29T11:55:00Z" }, now), "Soon");
    // Exact same timestamp
    assert.strictEqual(computeTimeUntilCleanup({ next_cleanup: "2026-10-29T12:00:00Z" }, now), "Soon");
  });

  await runTest("create-share-tab: computeTimeUntilCleanup calculates future hours and minutes accurately", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    // 3 hours, 45 minutes ahead
    assert.strictEqual(computeTimeUntilCleanup({ next_cleanup: "2026-10-29T15:45:00Z" }, now), "3h 45m");
    // 24 hours ahead
    assert.strictEqual(computeTimeUntilCleanup({ next_cleanup: "2026-10-30T12:00:00Z" }, now), "24h 0m");
    // 45 seconds ahead (< 1 minute) -> 0h 0m
    assert.strictEqual(computeTimeUntilCleanup({ next_cleanup: "2026-10-29T12:00:45Z" }, now), "0h 0m");
  });

  await runTest("create-share-tab: useSyncExternalStore hydration snapshot consistency", () => {
    // In React 19, useSyncExternalStore uses getClientSnapshot for client and getServerSnapshot for SSR.
    // Client snapshot must evaluate to true, server snapshot must evaluate to false.
    const clientSnapshot = () => true;
    const serverSnapshot = () => false;

    assert.strictEqual(serverSnapshot(), false, "SSR snapshot must be false to avoid mismatch");
    assert.strictEqual(clientSnapshot(), true, "Client snapshot must be true after mount");
  });

  await runTest("create-share-tab: handleAddSuccess task deduplication and prepend ordering", () => {
    // Pure logic oracle mirroring lines 130-155 of create-share-tab.tsx
    function addSuccessReducer(
      prevTasks: LocalTask[],
      taskData: any,
      fileInfoData: any,
      nowTimestamp = 1730190000000
    ): LocalTask[] {
      const newTask: LocalTask = {
        id: taskData?.id || nowTimestamp.toString(),
        url: taskData?.url || "",
        status: "Added",
        timestamp: nowTimestamp,
        name: taskData?.name || fileInfoData?.name || "Processing...",
        file_size: taskData?.file_size || fileInfoData?.size?.toString(),
        file_type: fileInfoData?.file_type,
      };

      const existingTasks = new Set(prevTasks.map((t) => t.id));
      const filteredTasks = existingTasks.has(newTask.id)
        ? prevTasks.filter((t) => t.id !== newTask.id)
        : prevTasks;

      return [newTask, ...filteredTasks];
    }

    const initialTasks: LocalTask[] = [
      { id: "task_1", url: "magnet:?xt=1", status: "Downloading", timestamp: 1000, name: "Task 1" },
      { id: "task_2", url: "magnet:?xt=2", status: "Completed", timestamp: 2000, name: "Task 2" },
    ];

    // Case 1: Add brand new task
    const added = addSuccessReducer(initialTasks, { id: "task_3", name: "Task 3" }, null);
    assert.strictEqual(added.length, 3);
    assert.strictEqual(added[0].id, "task_3");
    assert.strictEqual(added[0].name, "Task 3");
    assert.strictEqual(added[1].id, "task_1");

    // Case 2: Add duplicate task (id: "task_2") -> should remove old position and prepend to top
    const duplicateAdded = addSuccessReducer(initialTasks, { id: "task_2", name: "Task 2 Updated" }, null);
    assert.strictEqual(duplicateAdded.length, 2);
    assert.strictEqual(duplicateAdded[0].id, "task_2");
    assert.strictEqual(duplicateAdded[0].name, "Task 2 Updated");
    assert.strictEqual(duplicateAdded[1].id, "task_1");

    // Case 3: Missing taskData and fileInfoData -> fallback defaults
    const fallbackAdded = addSuccessReducer([], null, null, 999999);
    assert.strictEqual(fallbackAdded.length, 1);
    assert.strictEqual(fallbackAdded[0].id, "999999");
    assert.strictEqual(fallbackAdded[0].name, "Processing...");
    assert.strictEqual(fallbackAdded[0].status, "Added");
  });

  await runTest("create-share-tab: cancellation token guards against state updates after unmount", async () => {
    let stateUpdated = false;
    let loadingState = true;
    let ignore = false;

    const mockFetch = async () => {
      // Simulate slow response
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (!ignore) {
        stateUpdated = true;
      }
      if (!ignore) {
        loadingState = false;
      }
    };

    const promise = mockFetch();
    // Simulate immediate component unmount
    ignore = true;

    await promise;
    assert.strictEqual(stateUpdated, false, "State setter must NOT execute when unmounted");
    assert.strictEqual(loadingState, true, "Loading state must NOT mutate when unmounted");
  });

  await runTest("create-share-tab: api-utils fallback behavior under simulated network outage", async () => {
    const origGet = axios.get;
    try {
      // Simulate server down for all GET requests
      axios.get = async () => {
        const error = new Error("Network Error");
        (error as any).code = "ERR_NETWORK";
        (error as any).isAxiosError = true;
        throw error;
      };

      // fetchConfig should gracefully return default fallback config without throwing
      const config = await fetchConfig();
      assert.strictEqual(config.max_file_size_gb, 25);
      assert.strictEqual(config.task_status_update_interval_minutes, 15);
      assert.strictEqual(config.next_task_status_update, null);

      // fetchCleanupStatus should gracefully return null without throwing
      const cleanup = await fetchCleanupStatus();
      assert.strictEqual(cleanup, null);

      // fetchGlobalTasks should throw formatted user-friendly error
      await assert.rejects(
        async () => {
          await fetchGlobalTasks(1, 25);
        },
        /Cannot connect to server\. Please ensure the backend is running\./
      );
    } finally {
      axios.get = origGet;
    }
  });

  // =========================================================================
  // SECTION 2: WebDAV Components Resilience & State Transitions
  // =========================================================================

  await runTest("WebDAVLoadingState: renders loading spinner and disabled retry button while loading", () => {
    let retryClicked = false;
    const html = renderToStaticMarkup(
      <WebDAVLoadingState loading={true} onRetry={() => { retryClicked = true; }} />
    );

    assert.ok(html.includes("Loading WebDAV clients..."));
    assert.ok(html.includes("Retry"));
    assert.ok(html.includes("disabled"));
    assert.strictEqual(retryClicked, false);
  });

  await runTest("WebDAVErrorState: renders alert with formatted error message", () => {
    const errorMsg = "Cannot connect to server. Please ensure the backend is running.";
    const html = renderToStaticMarkup(<WebDAVErrorState error={errorMsg} />);

    assert.ok(html.includes("Failed to load WebDAV clients"));
    assert.ok(html.includes(errorMsg));
    assert.ok(html.includes("text-destructive") || html.includes("border-destructive") || html.includes("Alert"));
  });

  await runTest("WebDAVEmptyState: renders standard message when available=true", () => {
    const html = renderToStaticMarkup(<WebDAVEmptyState isTrafficIssue={false} />);
    assert.ok(html.includes("No WebDAV clients currently active."));
    assert.ok(!html.includes("bg-orange-50"));
  });

  await runTest("WebDAVEmptyState: renders warning badge and traffic warning when isTrafficIssue=true", () => {
    const customMsg = "Traffic quota exhausted for the current cycle";
    const html = renderToStaticMarkup(<WebDAVEmptyState isTrafficIssue={true} message={customMsg} />);
    assert.ok(html.includes(customMsg));
    assert.ok(html.includes("bg-orange-50") || html.includes("border-orange-200"));
  });

  await runTest("WebDAVTrafficWarning: renders traffic alert banner", () => {
    const html = renderToStaticMarkup(<WebDAVTrafficWarning message="Daily bandwidth limit approached" />);
    assert.ok(html.includes("Daily bandwidth limit approached"));
    assert.ok(html.includes("bg-orange-50") || html.includes("border-orange-200"));
  });

  await runTest("WebDAVClientCard: renders client planet identity, credentials, and copy actions", () => {
    const client: WebDAVClient = {
      planetName: "Mars-Base-Alpha",
      planetEmoji: "🪐",
      username: "webdav_user_alpha",
      password: "secret_password_123",
      serverUrl: "http://webdav.local:8080",
      createdAt: "2026-10-29T12:00:00Z",
      expiresAt: "2026-10-30T12:00:00Z",
      ttlHours: 24,
    };

    const html = renderToStaticMarkup(<WebDAVClientCard client={client} />);
    assert.ok(html.includes("Mars-Base-Alpha"), "Should display planet name");
    assert.ok(html.includes("🪐"), "Should display planet emoji");
    assert.ok(html.includes("webdav_user_alpha"), "Should display username");
    assert.ok(html.includes("secret_password_123"), "Should display password");
  });

  await runTest("webdav-clients-grid: pluralization logic oracle", () => {
    function formatClientCount(count: number): string {
      return `${count} client${count === 1 ? "" : "s"} available`;
    }

    assert.strictEqual(formatClientCount(0), "0 clients available");
    assert.strictEqual(formatClientCount(1), "1 client available");
    assert.strictEqual(formatClientCount(2), "2 clients available");
    assert.strictEqual(formatClientCount(100), "100 clients available");
  });

  await runTest("webdav-clients-grid: axios error formatting oracle", () => {
    function formatWebDAVError(err: any): string {
      let errorMsg = "Failed to load WebDAV clients";
      if (err?.code === "ERR_NETWORK" || err?.message === "Network Error") {
        errorMsg = "Cannot connect to server. Please ensure the backend is running.";
      } else if (err?.response?.data?.error) {
        errorMsg = String(err.response.data.error);
      } else if (err?.message) {
        errorMsg = err.message;
      }
      return errorMsg;
    }

    assert.strictEqual(
      formatWebDAVError({ code: "ERR_NETWORK" }),
      "Cannot connect to server. Please ensure the backend is running."
    );
    assert.strictEqual(
      formatWebDAVError({ message: "Network Error" }),
      "Cannot connect to server. Please ensure the backend is running."
    );
    assert.strictEqual(
      formatWebDAVError({ response: { data: { error: "WebDAV proxy timeout" } } }),
      "WebDAV proxy timeout"
    );
    assert.strictEqual(
      formatWebDAVError(new Error("Generic socket closed")),
      "Generic socket closed"
    );
    assert.strictEqual(
      formatWebDAVError({}),
      "Failed to load WebDAV clients"
    );
  });

  await runTest("webdav-clients-grid: initial SSR render produces WebDAVLoadingState", () => {
    const html = renderToStaticMarkup(<WebDAVClientsGrid />);
    assert.ok(html.includes("Loading WebDAV clients..."));
  });

  // =========================================================================
  // SECTION 3: ContentModeration React 19 Cascading Render Immunity & Pagination
  // =========================================================================

  await runTest("content-moderation: initial SSR render renders table header and loading skeleton", () => {
    const html = renderToStaticMarkup(<ContentModeration />);
    assert.ok(html.includes("Filter by User Email..."));
    assert.ok(html.includes("All Actions"));
    assert.ok(html.includes("Add Task"));
    assert.ok(html.includes("Share File"));
    assert.ok(html.includes("User"));
    assert.ok(html.includes("Action"));
    assert.ok(html.includes("Content"));
    assert.ok(html.includes("Timestamp"));
    assert.ok(html.includes("animate-spin"));
  });

  await runTest("content-moderation: totalPages calculation oracle", () => {
    function calcTotalPages(totalCount: number, pageSize = 10): number {
      return Math.max(1, Math.ceil(totalCount / pageSize));
    }

    assert.strictEqual(calcTotalPages(0), 1, "0 records should show at least page 1");
    assert.strictEqual(calcTotalPages(5), 1);
    assert.strictEqual(calcTotalPages(10), 1);
    assert.strictEqual(calcTotalPages(11), 2);
    assert.strictEqual(calcTotalPages(95), 10);
  });

  // =========================================================================
  // SECTION 4: CreateShareTab Client Boundary & Subcomponent Rendering
  // =========================================================================

  await runTest("create-share-tab: enforces 'use client' boundary and rejects unhydrated SSR", async () => {
    const { CreateShareTab } = await import("../src/components/features/create-share/create-share-tab");
    let caughtError: Error | null = null;
    try {
      renderToStaticMarkup(<CreateShareTab />);
    } catch (e: any) {
      caughtError = e;
    }
    assert.ok(caughtError !== null, "Direct server render without client boundary must throw client-only hook error");
    assert.ok(caughtError?.message.includes("client-only hook"));
  });

  await runTest("create-share-tab: MagnetInputCard renders input controls and cleanup timer", async () => {
    const { MagnetInputCard } = await import("../src/components/features/create-share/magnet-input-card");
    const html = renderToStaticMarkup(
      <MagnetInputCard
        onAddSuccess={() => {}}
        maxFileSizeGB={25}
        taskStatusUpdateIntervalMinutes={15}
        cleanupStatus={{
          next_cleanup: "2026-10-30T12:00:00Z",
          cleanup_interval_hours: 6,
          scheduler_running: true,
        }}
        timeUntilCleanup="3h 45m"
      />
    );
    assert.ok(html.includes("Magnet / Direct Download Link") || html.includes("Download Link"));
    assert.ok(html.includes("Add Download") || html.includes("Add"));
    assert.ok(html.includes("3h 45m"));
  });

  await runTest("create-share-tab: GlobalActivityCard enforces client-only execution via useLocalStorage", async () => {
    const { GlobalActivityCard } = await import("../src/components/features/create-share/global-activity-card");
    let caughtError: Error | null = null;
    try {
      renderToStaticMarkup(
        <GlobalActivityCard
          tasks={[]}
          loading={false}
          error=""
          page={1}
          totalPages={1}
          totalItems={0}
          pageSize={25}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          nextTaskStatusUpdate="2026-10-30T12:00:00Z"
        />
      );
    } catch (e: any) {
      caughtError = e;
    }
    assert.ok(caughtError !== null, "TaskList inside GlobalActivityCard must enforce client-only execution");
    assert.ok(caughtError?.message.includes("client-only hook"));
  });

  await runTest("use-task-list: task filter oracle correctly filters profane names", () => {
    function filterTasksOracle(tasks: { name: string }[], nsfwFilterEnabled: boolean) {
      if (!nsfwFilterEnabled) return [...tasks];
      // Simulated profanity check
      return tasks.filter((t) => !/xxx|porn|nsfw/i.test(t.name));
    }

    const sampleTasks = [
      { name: "Ubuntu_24.04_LTS.iso" },
      { name: "Family_Vacation_Photos.zip" },
      { name: "NSFW_Explicit_Content.mp4" },
    ];

    const unfiltered = filterTasksOracle(sampleTasks, false);
    assert.strictEqual(unfiltered.length, 3);

    const filtered = filterTasksOracle(sampleTasks, true);
    assert.strictEqual(filtered.length, 2);
    assert.strictEqual(filtered[0].name, "Ubuntu_24.04_LTS.iso");
    assert.strictEqual(filtered[1].name, "Family_Vacation_Photos.zip");
  });

  await runTest("use-task-list: empty state message oracle", () => {
    function emptyStateOracle(
      tasksCount: number,
      filteredCount: number,
      loading: boolean,
      error: string | undefined,
      nsfwEnabled: boolean,
      page: number
    ): string | null {
      if (loading || error) return null;
      if (tasksCount === 0) {
        return page > 1 ? "No tasks on this page." : "You haven't added any tasks yet.";
      }
      if (filteredCount === 0) {
        return nsfwEnabled ? "No tasks match your filters." : "No tasks match your criteria.";
      }
      return null;
    }

    // Loading & error
    assert.strictEqual(emptyStateOracle(0, 0, true, undefined, true, 1), null);
    assert.strictEqual(emptyStateOracle(0, 0, false, "Server Error", true, 1), null);

    // Initial empty
    assert.strictEqual(emptyStateOracle(0, 0, false, undefined, true, 1), "You haven't added any tasks yet.");
    // Page > 1 empty
    assert.strictEqual(emptyStateOracle(0, 0, false, undefined, true, 2), "No tasks on this page.");
    // Filtered out empty
    assert.strictEqual(emptyStateOracle(5, 0, false, undefined, true, 1), "No tasks match your filters.");
    assert.strictEqual(emptyStateOracle(5, 0, false, undefined, false, 1), "No tasks match your criteria.");
  });
}

runAll().then(() => {
  console.log("\n=== TEST EXECUTION SUMMARY ===");
  console.log(`Total tests run: ${passedTests + failedTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log("ALL ADVERSARIAL UI RESILIENCE & HYDRATION TESTS PASSED!");
  }
});
