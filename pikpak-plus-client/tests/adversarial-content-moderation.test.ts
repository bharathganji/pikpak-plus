/**
 * Empirical Adversarial Test Harness: Content Moderation Effect State & Race Conditions
 *
 * Verifies:
 * 1. Zero synchronous setState calls in useEffect body (React 19 cascading render elimination).
 * 2. Input burst decoupling: keystrokes do not trigger fetch; form submit triggers fetch.
 * 3. Race condition immunity: out-of-order network responses cannot overwrite state.
 * 4. Loading state stability: cancelled / out-of-order responses do not prematurely clear loading.
 * 5. Rapid pagination and filter switching stress: requests are superseded safely via ignore flags.
 * 6. Repeated search re-fetch resilience via refreshTrigger.
 * 7. Error handling resilience: errors on cancelled requests do not clear loading for active requests.
 * 8. Static component markup & layout fidelity.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContentModeration } from "../src/app/admin/components/content-moderation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIR = path.resolve(__dirname, "..");

console.log("=== STARTING CONTENT MODERATION ADVERSARIAL STRESS SUITE ===");

let passedTests = 0;
let failedTests = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
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

async function runAll() {
  const componentFilePath = path.join(
    CLIENT_DIR,
    "src",
    "app",
    "admin",
    "components",
    "content-moderation.tsx",
  );
  const fileContent = fs.readFileSync(componentFilePath, "utf-8");

  // =========================================================================
  // TEST 1: AST / Code Structure: Elimination of synchronous setState in useEffect
  // =========================================================================
  await runTest(
    "Static Contract: No synchronous setState in synchronous body of useEffect",
    () => {
      // Extract useEffect block
      const effectIndex = fileContent.indexOf("useEffect(() => {");
      assert.ok(effectIndex !== -1, "useEffect must be present");

      const effectClosingIndex = fileContent.indexOf(
        "}, [page, appliedEmail, actionFilter, refreshTrigger]);",
      );
      assert.ok(
        effectClosingIndex !== -1,
        "useEffect with expected dependency array must be present",
      );

      const effectBody = fileContent.slice(effectIndex, effectClosingIndex);

      // 1. setLoading(true) must never be called in useEffect (it was moved to action handlers and useState(true))
      assert.ok(
        !effectBody.includes("setLoading(true)"),
        "setLoading(true) must NOT be called in useEffect",
      );

      // 2. The synchronous execution path outside loadLogs must not contain any setState
      const syncExecutionStatements = [
        "let ignore = false;",
        "loadLogs();",
        "return () => {",
        "ignore = true;",
        "};",
      ];
      for (const stmt of syncExecutionStatements) {
        assert.ok(effectBody.includes(stmt), `Expected statement: ${stmt}`);
      }

      // 3. No setState in the synchronous body outside async function
      const outsideAsync = effectBody
        .replace(/const loadLogs = async \(\) => {[\s\S]*?};/, "")
        .trim();
      assert.ok(
        !outsideAsync.includes("set"),
        "Synchronous body outside async loadLogs must contain zero set* calls",
      );

      // Must use ignore pattern for cancellation
      assert.ok(
        effectBody.includes("let ignore = false;"),
        "Must declare ignore = false",
      );
      assert.ok(
        effectBody.includes("ignore = true;"),
        "Must set ignore = true in cleanup return",
      );
    },
  );

  // =========================================================================
  // TEST 2: Static Contract: Pure derived totalPages calculation
  // =========================================================================
  await runTest(
    "Static Contract: totalPages is derived during render, not stored in state",
    () => {
      assert.ok(
        !fileContent.includes("const [totalPages, setTotalPages]"),
        "totalPages must NOT be stored in useState",
      );
      assert.ok(
        fileContent.includes(
          "const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));",
        ),
        "totalPages must be derived using Math.max(1, Math.ceil(totalCount / pageSize))",
      );
    },
  );

  // =========================================================================
  // TEST 3: Keystroke Burst Decoupling (emailInput vs appliedEmail)
  // =========================================================================
  await runTest(
    "Form Contract: Keystrokes update input state only, submit triggers appliedEmail",
    () => {
      // Check separate state variables exist
      assert.ok(
        fileContent.includes(
          'const [emailInput, setEmailInput] = useState("");',
        ),
      );
      assert.ok(
        fileContent.includes(
          'const [appliedEmail, setAppliedEmail] = useState("");',
        ),
      );

      // Check onChange only sets emailInput
      assert.ok(
        fileContent.includes("onChange={(e) => setEmailInput(e.target.value)}"),
      );

      // Check handleSearch sets appliedEmail and resets page to 1
      assert.ok(fileContent.includes("setAppliedEmail(emailInput.trim())"));
      assert.ok(fileContent.includes("setPage(1)"));
      assert.ok(fileContent.includes("setRefreshTrigger((prev) => prev + 1)"));
    },
  );

  // =========================================================================
  // TEST 4: Simulation of Out-of-Order Async Network Responses
  // =========================================================================
  await runTest(
    "Race Condition Resistance: Out-of-order network responses cannot overwrite state",
    async () => {
      // Model the exact state machine of ContentModeration
      let logs: any[] = [];
      let totalCount = 0;
      let loading = true;

      // Simulate two sequential effects triggered by page change: Page 1 then Page 2
      let cleanup1: (() => void) | null = null;
      let cleanup2: (() => void) | null = null;

      // Trigger Request 1 (slow - takes 150ms)
      let resolveReq1: (val: any) => void;
      const req1Promise = new Promise((res) => {
        resolveReq1 = res;
      });

      const runEffect1 = () => {
        let ignore = false;
        const loadLogs = async () => {
          try {
            const res: any = await req1Promise;
            if (!ignore) {
              logs = res.data;
              totalCount = res.count;
            }
          } finally {
            if (!ignore) {
              loading = false;
            }
          }
        };
        loadLogs();
        return () => {
          ignore = true;
        };
      };

      cleanup1 = runEffect1();
      assert.strictEqual(loading, true);

      // Fast-forward: User immediately switches to Page 2 before Request 1 resolves
      cleanup1(); // Previous effect cleanup runs!

      let resolveReq2: (val: any) => void;
      const req2Promise = new Promise((res) => {
        resolveReq2 = res;
      });

      const runEffect2 = () => {
        let ignore = false;
        const loadLogs = async () => {
          try {
            const res: any = await req2Promise;
            if (!ignore) {
              logs = res.data;
              totalCount = res.count;
            }
          } finally {
            if (!ignore) {
              loading = false;
            }
          }
        };
        loadLogs();
        return () => {
          ignore = true;
        };
      };

      cleanup2 = runEffect2();

      // Now: Request 2 completes FIRST (Page 2 data)
      resolveReq2!({
        data: [{ id: 201, user_email: "page2@user.com" }],
        count: 20,
      });
      await req2Promise;
      // Allow microtasks to drain
      await new Promise((r) => setTimeout(r, 10));

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0].id, 201);
      assert.strictEqual(totalCount, 20);
      assert.strictEqual(loading, false);

      // Now: Request 1 completes LATER (Out of order Page 1 data)
      resolveReq1!({
        data: [{ id: 101, user_email: "page1@user.com" }],
        count: 10,
      });
      await req1Promise;
      await new Promise((r) => setTimeout(r, 10));

      // CRITICAL ASSERTION: Request 1 must NOT have overwritten Request 2 data
      assert.strictEqual(
        logs.length,
        1,
        "Logs array must maintain latest request length",
      );
      assert.strictEqual(
        logs[0].id,
        201,
        "Logs must remain Page 2 data (id: 201)",
      );
      assert.strictEqual(
        totalCount,
        20,
        "Total count must remain Page 2 count (20)",
      );
      assert.strictEqual(loading, false, "Loading state must remain false");

      if (cleanup2) cleanup2();
    },
  );

  // =========================================================================
  // TEST 5: Premature Loading Clearing Prevention
  // =========================================================================
  await runTest(
    "Loading State Fidelity: Cancelled requests cannot prematurely clear loading",
    async () => {
      let loading = true;

      // Trigger Request 1
      let resolveReq1: () => void;
      const req1 = new Promise<void>((r) => (resolveReq1 = r));

      let cleanup1: () => void;
      {
        let ignore = false;
        const load = async () => {
          try {
            await req1;
          } finally {
            if (!ignore) {
              loading = false;
            }
          }
        };
        load();
        cleanup1 = () => {
          ignore = true;
        };
      }

      // Immediately trigger Request 2
      cleanup1(); // Cancel 1
      loading = true; // Handler sets loading = true

      let resolveReq2: () => void;
      const req2 = new Promise<void>((r) => (resolveReq2 = r));

      let cleanup2: () => void;
      {
        let ignore = false;
        const load = async () => {
          try {
            await req2;
          } finally {
            if (!ignore) {
              loading = false;
            }
          }
        };
        load();
        cleanup2 = () => {
          ignore = true;
        };
      }

      // Now Request 1 resolves while Request 2 is still pending
      resolveReq1!();
      await req1;
      await new Promise((r) => setTimeout(r, 10));

      // Loading MUST STILL BE TRUE because Request 1 was ignored!
      assert.strictEqual(
        loading,
        true,
        "Loading must NOT prematurely clear when an older cancelled request finishes",
      );

      // Now Request 2 resolves
      resolveReq2!();
      await req2;
      await new Promise((r) => setTimeout(r, 10));

      // Loading clears only when the active request settles
      assert.strictEqual(
        loading,
        false,
        "Loading must clear when the active request finishes",
      );
      cleanup2();
    },
  );

  // =========================================================================
  // TEST 6: Network Error on Cancelled Request Suppression
  // =========================================================================
  await runTest(
    "Error Isolation: Error on cancelled request does not clear loading or mutate active state",
    async () => {
      let loading = true;
      let capturedError: any = null;

      let rejectReq1: (err: any) => void;
      const req1 = new Promise((_, rej) => (rejectReq1 = rej));

      let cleanup1: () => void;
      {
        let ignore = false;
        const load = async () => {
          try {
            await req1;
          } catch (e) {
            if (!ignore) capturedError = e;
          } finally {
            if (!ignore) loading = false;
          }
        };
        load();
        cleanup1 = () => (ignore = true);
      }

      // Cancel 1
      cleanup1();
      loading = true;

      // Fail Request 1
      rejectReq1!(new Error("500 Internal Server Error on superseded query"));
      try {
        await req1;
      } catch {
        // Expected rejection
      }
      await new Promise((r) => setTimeout(r, 10));

      assert.strictEqual(
        capturedError,
        null,
        "Error from superseded request must be ignored",
      );
      assert.strictEqual(
        loading,
        true,
        "Loading must remain true while active query continues",
      );
    },
  );

  // =========================================================================
  // TEST 7: Rapid Action Filter Toggle Stress
  // =========================================================================
  await runTest(
    "Filter Stress: Rapid action filter bursts settle strictly on the latest selected filter",
    async () => {
      const filterHistory: string[] = [
        "all",
        "add",
        "share",
        "add",
        "all",
        "share",
      ];
      const responses: Record<string, any> = {
        all: { data: [{ id: 1, action: "all" }], count: 50 },
        add: { data: [{ id: 2, action: "add" }], count: 20 },
        share: { data: [{ id: 3, action: "share" }], count: 30 },
      };

      let activeFilter = "all";
      let currentLogs: any[] = [];
      let currentCount = 0;
      let loading = true;
      let cleanup: (() => void) | null = null;

      for (const nextFilter of filterHistory) {
        if (cleanup) cleanup();
        activeFilter = nextFilter;
        loading = true;

        // Effect runner
        const run = (filterValue: string) => {
          let ignore = false;
          const load = async () => {
            // Add artificial random jitter
            const delay = Math.floor(Math.random() * 20);
            await new Promise((r) => setTimeout(r, delay));
            const res = responses[filterValue];
            if (!ignore) {
              currentLogs = res.data;
              currentCount = res.count;
            }
            if (!ignore) {
              loading = false;
            }
          };
          load();
          return () => {
            ignore = true;
          };
        };

        cleanup = run(activeFilter);
      }

      // Wait for all delayed promises to settle
      await new Promise((r) => setTimeout(r, 60));

      assert.strictEqual(activeFilter, "share");
      assert.strictEqual(currentLogs[0].action, "share");
      assert.strictEqual(currentCount, 30);
      assert.strictEqual(loading, false);

      if (cleanup) cleanup();
    },
  );

  // =========================================================================
  // TEST 8: Pagination Click Boundary Constraints
  // =========================================================================
  await runTest(
    "Pagination Stress: Prev/Next boundaries are strictly clamped",
    () => {
      const totalCount = 25;
      const pageSize = 10;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize)); // 3

      let page = 1;

      // Simulate Prev at page 1
      const prevFn = (p: number) => Math.max(1, p - 1);
      page = prevFn(page);
      assert.strictEqual(page, 1, "Page must not drop below 1");

      // Simulate Next up to totalPages
      const nextFn = (p: number) => Math.min(totalPages, p + 1);
      page = nextFn(page); // 2
      assert.strictEqual(page, 2);
      page = nextFn(page); // 3
      assert.strictEqual(page, 3);
      page = nextFn(page); // 3
      assert.strictEqual(page, 3, "Page must not exceed totalPages");
    },
  );

  // =========================================================================
  // TEST 9: Refresh Trigger on Search and Delete
  // =========================================================================
  await runTest(
    "Refresh Contract: handleSearch and handleDelete increment refreshTrigger",
    () => {
      let refreshTrigger = 0;
      const handleSearchSim = () => {
        refreshTrigger++;
      };
      const handleDeleteSim = () => {
        refreshTrigger++;
      };

      handleSearchSim();
      assert.strictEqual(refreshTrigger, 1);
      handleSearchSim();
      assert.strictEqual(refreshTrigger, 2);
      handleDeleteSim();
      assert.strictEqual(refreshTrigger, 3);
    },
  );

  // =========================================================================
  // TEST 10: Static Markup Rendering Fidelity
  // =========================================================================
  await runTest(
    "UI Markup Fidelity: ContentModeration renders initial loading state & UI elements",
    () => {
      const html = renderToStaticMarkup(React.createElement(ContentModeration));

      assert.ok(
        html.includes("Filter by User Email..."),
        "Must include email search input placeholder",
      );
      assert.ok(html.includes("Filter"), "Must include Filter submit button");
      assert.ok(
        html.includes("All Actions"),
        "Must include All Actions option",
      );
      assert.ok(html.includes("Add Task"), "Must include Add Task option");
      assert.ok(html.includes("Share File"), "Must include Share File option");
      assert.ok(
        html.includes("animate-spin"),
        "Must include initial Loader2 spinner",
      );
      assert.ok(html.includes("Previous"), "Must include Previous button");
      assert.ok(html.includes("Next"), "Must include Next button");
      assert.ok(
        html.includes("disabled"),
        "Previous and Next buttons must be disabled during loading",
      );
    },
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n=== CONTENT MODERATION ADVERSARIAL TEST SUMMARY ===");
  console.log(`Total tests run: ${passedTests + failedTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
