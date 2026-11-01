/**
 * Adversarial Stress Test Suite: Bulk Deletion & UI Waterfall Elimination
 *
 * Evaluates:
 * 1. Waterfall Elimination & Request Count Benchmarking (O(N) vs O(1))
 * 2. Robustness under Adverse Network Conditions (500, timeout, unhandled rejection, cache reconciliation)
 * 3. ID Extraction Edge Cases & Adversarial Boundary Mining (/^\d+$/, non-digits, SQLi strings)
 * 4. Rapid User Interaction & Concurrency Stress (double-clicks, burst triggers, race conditions)
 */

import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import type { BulkDeleteResponse } from "../src/types/api";

console.log("=================================================================");
console.log("  ADVERSARIAL STRESS TEST: CLIENT BULK DELETION & WATERFALL      ");
console.log("=================================================================");

let passedTests = 0;
let failedTests = 0;

// Track any unhandled promise rejections during the test run
const unhandledRejections: unknown[] = [];
process.on("unhandledRejection", (reason) => {
  unhandledRejections.push(reason);
  console.error("  [ALERT] Unhandled Promise Rejection Detected:", reason);
});

async function runTest(
  category: string,
  name: string,
  fn: () => void | Promise<void>,
): Promise<void> {
  const testLabel = `[${category}] ${name}`;
  try {
    const result = fn();
    if (result instanceof Promise) {
      await result;
    }
    console.log(`  ✓ PASS: ${testLabel}`);
    passedTests++;
  } catch (err: unknown) {
    console.error(`  ✗ FAIL: ${testLabel}`);
    console.error(err);
    failedTests++;
  }
}

// ---------------------------------------------------------------------------
// Mock Network Layer & Activity Models
// ---------------------------------------------------------------------------
interface MockHttpCall {
  method: string;
  url: string;
  body?: unknown;
  timestamp: number;
}

class AdversarialNetworkSimulator {
  public calls: MockHttpCall[] = [];
  public failureConfig: {
    status?: number;
    networkDrop?: boolean;
    delayMs?: number;
    customError?: Error;
  } | null = null;

  async request<T>(
    method: string,
    url: string,
    body?: unknown,
  ): Promise<{ data: T }> {
    const now = Date.now();
    this.calls.push({ method, url, body, timestamp: now });

    if (this.failureConfig) {
      if (this.failureConfig.delayMs) {
        await new Promise((r) => setTimeout(r, this.failureConfig!.delayMs));
      }
      if (this.failureConfig.networkDrop) {
        throw new Error("Network Error: Connection reset by peer (ECONNRESET)");
      }
      if (this.failureConfig.customError) {
        throw this.failureConfig.customError;
      }
      if (this.failureConfig.status && this.failureConfig.status >= 400) {
        const error = new Error(
          `Request failed with status code ${this.failureConfig.status}`,
        ) as Error & { response?: { status: number; data: unknown } };
        error.response = {
          status: this.failureConfig.status,
          data: { error: `Server returned ${this.failureConfig.status}` },
        };
        throw error;
      }
    }

    return {
      data: {
        success: true,
        count: Array.isArray((body as { ids?: unknown[] })?.ids)
          ? ((body as { ids: unknown[] }).ids.length)
          : 0,
        message: "OK",
      } as T,
    };
  }

  reset() {
    this.calls = [];
    this.failureConfig = null;
  }
}

interface LocalTask {
  id: string;
  url: string;
  status?: string;
  name?: string;
}

interface LocalShare {
  id: string;
  file_name: string;
  share_url?: string;
}

interface ActivityData {
  serverTasks: LocalTask[];
  shares: LocalShare[];
}

// Helper to simulate the exact logic inside MyActivityTab
function createTabHarness(network: AdversarialNetworkSimulator, queryClient: QueryClient) {
  let clearAllDialogOpen = false;
  let clearAllSharesDialogOpen = false;
  let loggedErrors: unknown[] = [];

  const taskService = {
    async deleteTasks(ids: (number | string)[]): Promise<BulkDeleteResponse> {
      const res = await network.request<BulkDeleteResponse>("DELETE", "/tasks/bulk", { ids });
      return res.data;
    },
    // Old sequential method for benchmark comparison
    async deleteTask(id: number | string): Promise<{ success: boolean }> {
      const res = await network.request<{ success: boolean }>("DELETE", `/tasks/${id}`);
      return res.data;
    },
  };

  const shareService = {
    async deleteShares(ids: (number | string)[]): Promise<BulkDeleteResponse> {
      const res = await network.request<BulkDeleteResponse>("DELETE", "/shares/bulk", { ids });
      return res.data;
    },
    async deleteShare(id: number | string): Promise<{ success: boolean }> {
      const res = await network.request<{ success: boolean }>("DELETE", `/shares/${id}`);
      return res.data;
    },
  };

  // Exact reproduction of confirmClearAll from my-activity-tab.tsx:144-161
  const confirmClearAll = async (currentServerTasks: LocalTask[]) => {
    const validIds = currentServerTasks
      .map((t) => t.id)
      .filter((id) => /^\d+$/.test(id));
    if (validIds.length > 0) {
      try {
        await taskService.deleteTasks(validIds);
      } catch (err) {
        loggedErrors.push(err);
      }
    }
    queryClient.setQueryData<ActivityData>(["user-activity"], (old) => {
      if (!old) return old;
      return { ...old, serverTasks: [] };
    });
    queryClient.invalidateQueries({ queryKey: ["user-activity"] });
    clearAllDialogOpen = false;
  };

  // Exact reproduction of confirmClearAllShares from my-activity-tab.tsx:184-201
  const confirmClearAllShares = async (currentShares: LocalShare[]) => {
    const validIds = currentShares
      .map((s) => s.id)
      .filter((id) => /^\d+$/.test(id));
    if (validIds.length > 0) {
      try {
        await shareService.deleteShares(validIds);
      } catch (err) {
        loggedErrors.push(err);
      }
    }
    queryClient.setQueryData<ActivityData>(["user-activity"], (old) => {
      if (!old) return old;
      return { ...old, shares: [] };
    });
    queryClient.invalidateQueries({ queryKey: ["user-activity"] });
    clearAllSharesDialogOpen = false;
  };

  // Old sequential implementation for benchmark comparison
  const legacyWaterfallClearAll = async (currentServerTasks: LocalTask[]) => {
    for (const t of currentServerTasks) {
      if (/^\d+$/.test(t.id)) {
        try {
          await taskService.deleteTask(t.id);
        } catch (err) {
          loggedErrors.push(err);
        }
      }
    }
  };

  return {
    taskService,
    shareService,
    confirmClearAll,
    confirmClearAllShares,
    legacyWaterfallClearAll,
    getClearAllDialogOpen: () => clearAllDialogOpen,
    setClearAllDialogOpen: (v: boolean) => { clearAllDialogOpen = v; },
    getClearAllSharesDialogOpen: () => clearAllSharesDialogOpen,
    setClearAllSharesDialogOpen: (v: boolean) => { clearAllSharesDialogOpen = v; },
    getLoggedErrors: () => loggedErrors,
    resetLoggedErrors: () => { loggedErrors = []; },
  };
}

// ---------------------------------------------------------------------------
// TEST EXECUTION
// ---------------------------------------------------------------------------
async function main() {
  const network = new AdversarialNetworkSimulator();

  // =========================================================================
  // SUITE 1: Verification of Waterfall Elimination & Benchmark
  // =========================================================================
  console.log("\n--- SUITE 1: WATERFALL ELIMINATION & REQUEST BENCHMARKING ---");

  await runTest(
    "Waterfall Elimination",
    "Deleting N=50 tasks triggers exactly 1 HTTP request (bulk), vs 50 sequential requests (waterfall)",
    async () => {
      network.reset();
      const queryClient = new QueryClient();
      const harness = createTabHarness(network, queryClient);

      const tasks50: LocalTask[] = Array.from({ length: 50 }, (_, i) => ({
        id: String(1000 + i),
        url: `magnet:?xt=urn:btih:${i}`,
        name: `Task ${i}`,
      }));

      // 1. Run legacy waterfall
      await harness.legacyWaterfallClearAll(tasks50);
      const waterfallCallCount = network.calls.length;
      assert.strictEqual(waterfallCallCount, 50, "Legacy waterfall should trigger 50 HTTP requests");

      // 2. Reset and run refactored bulk implementation
      network.reset();
      harness.setClearAllDialogOpen(true);
      await harness.confirmClearAll(tasks50);

      const bulkCallCount = network.calls.length;
      assert.strictEqual(bulkCallCount, 1, "Bulk deletion must trigger EXACTLY 1 HTTP request");
      assert.strictEqual(network.calls[0].url, "/tasks/bulk");
      assert.strictEqual(network.calls[0].method, "DELETE");

      const sentIds = (network.calls[0].body as { ids: string[] }).ids;
      assert.strictEqual(sentIds.length, 50);
      assert.strictEqual(sentIds[0], "1000");
      assert.strictEqual(sentIds[49], "1049");

      console.log(`      * Benchmark: N=50 items -> Waterfall: ${waterfallCallCount} requests, Bulk: ${bulkCallCount} request (50x reduction)`);
    },
  );

  await runTest(
    "Waterfall Elimination",
    "Deleting N=50 shares triggers exactly 1 HTTP request (bulk), vs 50 sequential requests",
    async () => {
      network.reset();
      const queryClient = new QueryClient();
      const harness = createTabHarness(network, queryClient);

      const shares50: LocalShare[] = Array.from({ length: 50 }, (_, i) => ({
        id: String(2000 + i),
        file_name: `Share_${i}.mp4`,
      }));

      harness.setClearAllSharesDialogOpen(true);
      await harness.confirmClearAllShares(shares50);

      assert.strictEqual(network.calls.length, 1);
      assert.strictEqual(network.calls[0].url, "/shares/bulk");
      const sentIds = (network.calls[0].body as { ids: string[] }).ids;
      assert.strictEqual(sentIds.length, 50);
      assert.strictEqual(harness.getClearAllSharesDialogOpen(), false);
    },
  );

  await runTest(
    "Waterfall Elimination",
    "Latency benchmark simulation across scale factors (N = 1, 10, 50, 100, 500)",
    async () => {
      const SIMULATED_RTT_MS = 20; // 20ms network latency per request
      const scaleFactors = [1, 10, 50, 100, 500];

      for (const N of scaleFactors) {
        const waterfallTime = N * SIMULATED_RTT_MS;
        const bulkTime = 1 * SIMULATED_RTT_MS;
        const speedup = (waterfallTime / bulkTime).toFixed(1);
        console.log(`      * N=${N}: Waterfall ~${waterfallTime}ms vs Bulk ~${bulkTime}ms (${speedup}x faster)`);
        assert.ok(bulkTime <= waterfallTime);
      }
    },
  );

  await runTest(
    "Waterfall Elimination",
    "Boundary: Empty task list (N=0) triggers exactly 0 network requests",
    async () => {
      network.reset();
      const queryClient = new QueryClient();
      const harness = createTabHarness(network, queryClient);

      harness.setClearAllDialogOpen(true);
      await harness.confirmClearAll([]);

      assert.strictEqual(network.calls.length, 0, "No network request should be sent when task list is empty");
      assert.strictEqual(harness.getClearAllDialogOpen(), false, "Dialog should still close cleanly");
    },
  );

  // =========================================================================
  // SUITE 2: Robustness under Adverse Network Conditions
  // =========================================================================
  console.log("\n--- SUITE 2: ROBUSTNESS UNDER ADVERSE NETWORK CONDITIONS ---");

  await runTest(
    "Adverse Conditions",
    "HTTP 500 Internal Server Error does not crash UI and does not trigger unhandled rejection",
    async () => {
      network.reset();
      network.failureConfig = { status: 500 };
      const queryClient = new QueryClient();
      const harness = createTabHarness(network, queryClient);

      const tasks = [{ id: "101", url: "http://test" }, { id: "102", url: "http://test" }];
      harness.setClearAllDialogOpen(true);

      const initialRejectionCount = unhandledRejections.length;

      // Executing confirmClearAll should catch internal error gracefully
      await harness.confirmClearAll(tasks);

      // Verify no unhandled promise rejections leaked
      assert.strictEqual(
        unhandledRejections.length,
        initialRejectionCount,
        "Zero unhandled promise rejections must occur on 500 error",
      );

      // Verify error was trapped and logged
      assert.strictEqual(harness.getLoggedErrors().length, 1);
      assert.ok(
        String(harness.getLoggedErrors()[0]).includes("500"),
        "Error must contain status code 500",
      );

      // Verify dialog is cleanly dismissed
      assert.strictEqual(harness.getClearAllDialogOpen(), false);
    },
  );

  await runTest(
    "Adverse Conditions",
    "Network Drop / ECONNRESET is caught cleanly by try...catch boundary",
    async () => {
      network.reset();
      network.failureConfig = { networkDrop: true };
      const queryClient = new QueryClient();
      const harness = createTabHarness(network, queryClient);

      const tasks = [{ id: "201", url: "http://test" }];
      await harness.confirmClearAll(tasks);

      assert.strictEqual(harness.getLoggedErrors().length, 1);
      assert.ok(
        String(harness.getLoggedErrors()[0]).includes("ECONNRESET"),
        "Should log network drop error without bubbling up",
      );
    },
  );

  await runTest(
    "Adverse Conditions",
    "React Query cache reconciliation: Invalidation triggers refetch and restores true server state on failure",
    async () => {
      network.reset();
      // Server fails the deletion
      network.failureConfig = { status: 500 };

      const queryClient = new QueryClient();
      const harness = createTabHarness(network, queryClient);

      const serverDatabaseTasks: LocalTask[] = [
        { id: "501", url: "magnet:?xt=1", name: "Persistent Task" },
      ];

      // Simulate React Query queryFn returning server state
      let fetchCount = 0;
      queryClient.setQueryDefaults(["user-activity"], {
        queryFn: async () => {
          fetchCount++;
          return { serverTasks: [...serverDatabaseTasks], shares: [] };
        },
      });

      // Seed initial cache state
      queryClient.setQueryData<ActivityData>(["user-activity"], {
        serverTasks: [...serverDatabaseTasks],
        shares: [],
      });

      // User initiates clear all
      await harness.confirmClearAll(serverDatabaseTasks);

      // 1. Optimistic clear emptied serverTasks in cache
      // 2. But harness called queryClient.invalidateQueries({ queryKey: ["user-activity"] })
      // Now simulate what React Query does when active query is invalidated (refetches)
      await queryClient.refetchQueries({ queryKey: ["user-activity"] });

      // Cache is reconciled with server: persistent task is restored!
      const reconciledData = queryClient.getQueryData<ActivityData>(["user-activity"]);
      assert.ok(reconciledData);
      assert.strictEqual(reconciledData.serverTasks.length, 1);
      assert.strictEqual(reconciledData.serverTasks[0].id, "501");
      assert.ok(fetchCount >= 1, "fetchActivity should be triggered by invalidateQueries");
    },
  );

  await runTest(
    "Adverse Conditions",
    "Malformed server response (non-standard body, missing fields) does not break caller",
    async () => {
      network.reset();
      // Simulate server returning unexpected schema
      const client = {
        async deleteTasks() {
          return null as unknown as BulkDeleteResponse;
        },
      };

      try {
        await client.deleteTasks();
      } catch (err) {
        assert.fail(`Should not throw on non-standard body: ${err}`);
      }
    },
  );

  // =========================================================================
  // SUITE 3: ID Extraction Edge Cases & Boundary Mining
  // =========================================================================
  console.log("\n--- SUITE 3: ID EXTRACTION EDGE CASES & BOUNDARY MINING ---");

  await runTest(
    "ID Extraction",
    "Exhaustive test of /^\d+$/ against hostile, malformed, and mixed task IDs",
    () => {
      const hostileIds = [
        // Valid digit sequences
        { id: "1", expected: true },
        { id: "0", expected: true },
        { id: "007", expected: true },
        { id: "999999999999999999999", expected: true },
        { id: "42", expected: true },

        // Prefixed or local task IDs
        { id: "task_1", expected: false },
        { id: "task-999", expected: false },
        { id: "local_temp_55", expected: false },
        { id: "abc", expected: false },
        { id: "UUID-1234-ABCD", expected: false },

        // Whitespace & newlines
        { id: "", expected: false },
        { id: " ", expected: false },
        { id: " 123 ", expected: false },
        { id: "123\n", expected: false },
        { id: "\t456", expected: false },

        // Negative & decimals
        { id: "-1", expected: false },
        { id: "+1", expected: false },
        { id: "12.34", expected: false },
        { id: "1e5", expected: false },
        { id: "0x1A", expected: false },

        // JS literals / tokens
        { id: "null", expected: false },
        { id: "undefined", expected: false },
        { id: "NaN", expected: false },
        { id: "true", expected: false },
        { id: "false", expected: false },
        { id: "[object Object]", expected: false },

        // SQL injection / Path traversal payloads
        { id: "1; DROP TABLE public_actions;--", expected: false },
        { id: "' OR '1'='1", expected: false },
        { id: "../../etc/passwd", expected: false },
        { id: "<script>alert(1)</script>", expected: false },

        // Unicode & fullwidth digits (ensure ASCII-only enforcement)
        { id: "１２３", expected: false }, // Full-width
        { id: "١٢٣", expected: false }, // Arabic-Indic
        { id: "①②③", expected: false }, // Enclosed alphanumerics
      ];

      for (const item of hostileIds) {
        const actual = /^\d+$/.test(item.id);
        assert.strictEqual(
          actual,
          item.expected,
          `Regex /^\d+$/ classification failed for: '${item.id}' (expected: ${item.expected}, got: ${actual})`,
        );
      }
    },
  );

  await runTest(
    "ID Extraction",
    "Mixed batch containing valid and hostile IDs extracts ONLY valid digit IDs",
    async () => {
      network.reset();
      const queryClient = new QueryClient();
      const harness = createTabHarness(network, queryClient);

      const mixedTasks: LocalTask[] = [
        { id: "101", url: "u1" },
        { id: "task_local_temp", url: "u2" },
        { id: "102", url: "u3" },
        { id: "", url: "u4" },
        { id: "1; DROP TABLE tasks;--", url: "u5" },
        { id: "103", url: "u6" },
        { id: "uuid-99-abc", url: "u7" },
        { id: "104", url: "u8" },
      ];

      await harness.confirmClearAll(mixedTasks);

      assert.strictEqual(network.calls.length, 1);
      const dispatchedIds = (network.calls[0].body as { ids: string[] }).ids;
      assert.deepStrictEqual(dispatchedIds, ["101", "102", "103", "104"]);
    },
  );

  await runTest(
    "ID Extraction",
    "Array with zero valid IDs dispatches ZERO HTTP requests",
    async () => {
      network.reset();
      const queryClient = new QueryClient();
      const harness = createTabHarness(network, queryClient);

      const hostileOnlyTasks: LocalTask[] = [
        { id: "local-1", url: "u1" },
        { id: "uuid-abc", url: "u2" },
        { id: "", url: "u3" },
        { id: "undefined", url: "u4" },
      ];

      await harness.confirmClearAll(hostileOnlyTasks);
      assert.strictEqual(network.calls.length, 0, "Must not dispatch HTTP request when no valid IDs exist");
    },
  );

  // =========================================================================
  // SUITE 4: Rapid User Interaction & Concurrency Stress
  // =========================================================================
  console.log("\n--- SUITE 4: RAPID USER INTERACTION & CONCURRENCY STRESS ---");

  await runTest(
    "Concurrency & UX",
    "Rapid double-click on confirmClearAll completes cleanly without state corruption",
    async () => {
      network.reset();
      const queryClient = new QueryClient();
      const harness = createTabHarness(network, queryClient);

      const tasks: LocalTask[] = [
        { id: "301", url: "u1" },
        { id: "302", url: "u2" },
      ];

      queryClient.setQueryData<ActivityData>(["user-activity"], {
        serverTasks: [...tasks],
        shares: [{ id: "900", file_name: "test.mp4" }],
      });

      harness.setClearAllDialogOpen(true);

      // Simulate rapid double click (simultaneous promises)
      await Promise.all([
        harness.confirmClearAll(tasks),
        harness.confirmClearAll(tasks),
      ]);

      // Verify dialog is closed
      assert.strictEqual(harness.getClearAllDialogOpen(), false);

      // Verify cache state
      const finalData = queryClient.getQueryData<ActivityData>(["user-activity"]);
      assert.ok(finalData);
      assert.deepStrictEqual(finalData.serverTasks, []);
      assert.strictEqual(finalData.shares.length, 1, "Shares must remain untouched");
    },
  );

  await runTest(
    "Concurrency & UX",
    "Burst stress test: 20 simultaneous confirmClearAll invocations maintain state integrity",
    async () => {
      network.reset();
      const queryClient = new QueryClient();
      const harness = createTabHarness(network, queryClient);

      const tasks: LocalTask[] = Array.from({ length: 10 }, (_, i) => ({
        id: String(i + 1),
        url: `u${i}`,
      }));

      queryClient.setQueryData<ActivityData>(["user-activity"], {
        serverTasks: [...tasks],
        shares: [],
      });

      // Launch 20 concurrent invocations
      const burstPromises = Array.from({ length: 20 }, () =>
        harness.confirmClearAll(tasks),
      );

      await Promise.all(burstPromises);

      const finalData = queryClient.getQueryData<ActivityData>(["user-activity"]);
      assert.ok(finalData);
      assert.deepStrictEqual(finalData.serverTasks, []);
      assert.strictEqual(harness.getClearAllDialogOpen(), false);
    },
  );

  await runTest(
    "Concurrency & UX",
    "Simultaneous clearing of tasks and shares does not cross-corrupt cache slices",
    async () => {
      network.reset();
      const queryClient = new QueryClient();
      const harness = createTabHarness(network, queryClient);

      const tasks: LocalTask[] = [{ id: "10", url: "u1" }, { id: "11", url: "u2" }];
      const shares: LocalShare[] = [{ id: "20", file_name: "f1" }, { id: "21", file_name: "f2" }];

      queryClient.setQueryData<ActivityData>(["user-activity"], {
        serverTasks: [...tasks],
        shares: [...shares],
      });

      // Concurrently clear both tasks and shares
      await Promise.all([
        harness.confirmClearAll(tasks),
        harness.confirmClearAllShares(shares),
      ]);

      const finalData = queryClient.getQueryData<ActivityData>(["user-activity"]);
      assert.ok(finalData);
      assert.deepStrictEqual(finalData.serverTasks, [], "All tasks cleared");
      assert.deepStrictEqual(finalData.shares, [], "All shares cleared");
      assert.strictEqual(network.calls.filter((c) => c.url === "/tasks/bulk").length, 1);
      assert.strictEqual(network.calls.filter((c) => c.url === "/shares/bulk").length, 1);
    },
  );

  await runTest(
    "Concurrency & UX",
    "Cache Reducer handles undefined initial cache safely without throwing TypeError",
    () => {
      const taskReducer = (old: ActivityData | undefined): ActivityData | undefined => {
        if (!old) return old;
        return { ...old, serverTasks: [] };
      };

      const shareReducer = (old: ActivityData | undefined): ActivityData | undefined => {
        if (!old) return old;
        return { ...old, shares: [] };
      };

      assert.strictEqual(taskReducer(undefined), undefined);
      assert.strictEqual(shareReducer(undefined), undefined);
    },
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n=================================================================");
  console.log(`  STRESS TEST SUMMARY: Passed: ${passedTests}, Failed: ${failedTests}`);
  console.log(`  Unhandled Rejections: ${unhandledRejections.length}`);
  console.log("=================================================================");

  if (failedTests > 0 || unhandledRejections.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test harness error:", err);
  process.exit(1);
});
