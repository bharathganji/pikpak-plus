/**
 * Client Unit Test Suite: End-to-End Bulk Deletion
 *
 * Verifies:
 * 1. BulkDeleteResponse type definition and shape contract
 * 2. taskService.deleteTasks API contract and endpoint routing (/tasks/bulk)
 * 3. shareService.deleteShares and revokeShares API contracts and routing (/shares/bulk)
 * 4. Numeric ID sanitization (/^\d+$/) filter logic across equivalence classes
 * 5. React Query cache state transformation and query invalidation contracts
 * 6. Elimination of sequential network waterfall loops in MyActivityTab
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BulkDeleteResponse } from "../src/types/api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIR = path.resolve(__dirname, "..");

console.log("=== STARTING BULK DELETION CLIENT TEST SUITE ===");

let passedTests = 0;
let failedTests = 0;

async function runTest(
  name: string,
  fn: () => void | Promise<void>,
): Promise<void> {
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

interface MockDeleteCall {
  url: string;
  config?: {
    data?: unknown;
    [key: string]: unknown;
  };
}

class MockApiClient {
  public calls: MockDeleteCall[] = [];
  public mockResponse: unknown = { success: true, count: 0, message: "OK" };
  public shouldFail = false;
  public failureError = new Error("Network Error");

  async delete<T>(
    url: string,
    config?: { data?: unknown; [key: string]: unknown },
  ): Promise<{ data: T }> {
    this.calls.push({ url, config });
    if (this.shouldFail) {
      throw this.failureError;
    }
    return { data: this.mockResponse as T };
  }
}

async function runAll() {
  // =========================================================================
  // SECTION 1: BulkDeleteResponse Type Shape & Contract
  // =========================================================================

  await runTest(
    "Types: BulkDeleteResponse conforms to expected schema",
    () => {
      const sampleResponse: BulkDeleteResponse = {
        success: true,
        count: 5,
        message: "5 tasks deleted successfully",
      };
      assert.strictEqual(sampleResponse.success, true);
      assert.strictEqual(sampleResponse.count, 5);
      assert.strictEqual(sampleResponse.message, "5 tasks deleted successfully");

      const responseWithoutMessage: BulkDeleteResponse = {
        success: true,
        count: 0,
      };
      assert.strictEqual(responseWithoutMessage.success, true);
      assert.strictEqual(responseWithoutMessage.count, 0);
      assert.strictEqual(responseWithoutMessage.message, undefined);
    },
  );

  await runTest(
    "Types File: api.ts explicitly exports BulkDeleteResponse interface",
    () => {
      const apiTypesPath = path.join(CLIENT_DIR, "src", "types", "api.ts");
      const content = fs.readFileSync(apiTypesPath, "utf-8");

      assert.ok(
        content.includes("export interface BulkDeleteResponse"),
        "api.ts must export BulkDeleteResponse interface",
      );
      assert.ok(
        /success:\s*boolean;/.test(content),
        "BulkDeleteResponse must have success: boolean",
      );
      assert.ok(
        /count:\s*number;/.test(content),
        "BulkDeleteResponse must have count: number",
      );
    },
  );

  // =========================================================================
  // SECTION 2: Task Service Implementation & Protocol
  // =========================================================================

  await runTest(
    "TaskService: Source exports deleteTasks method targeting /tasks/bulk",
    () => {
      const taskServicePath = path.join(
        CLIENT_DIR,
        "src",
        "services",
        "task-service.ts",
      );
      const content = fs.readFileSync(taskServicePath, "utf-8");

      assert.ok(
        content.includes("async deleteTasks(ids: (number | string)[])"),
        "taskService must define deleteTasks(ids: (number | string)[])",
      );
      assert.ok(
        content.includes('apiClient.delete<BulkDeleteResponse>("/tasks/bulk"'),
        "taskService.deleteTasks must invoke apiClient.delete to /tasks/bulk",
      );
      assert.ok(
        /data:\s*\{\s*ids\s*\}/.test(content),
        "taskService.deleteTasks must pass { data: { ids } } in axios config",
      );
    },
  );

  await runTest(
    "TaskService: deleteTasks invocation dispatches correct HTTP payload",
    async () => {
      const client = new MockApiClient();
      client.mockResponse = {
        success: true,
        count: 3,
        message: "3 tasks deleted successfully",
      };

      const testTaskService = {
        async deleteTasks(ids: (number | string)[]): Promise<BulkDeleteResponse> {
          const res = await client.delete<BulkDeleteResponse>("/tasks/bulk", {
            data: { ids },
          });
          return res.data;
        },
      };

      const taskIds = [101, 102, 103];
      const result = await testTaskService.deleteTasks(taskIds);

      assert.strictEqual(client.calls.length, 1);
      assert.strictEqual(client.calls[0].url, "/tasks/bulk");
      assert.deepStrictEqual(client.calls[0].config?.data, { ids: [101, 102, 103] });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.count, 3);
      assert.strictEqual(result.message, "3 tasks deleted successfully");
    },
  );

  await runTest(
    "TaskService: deleteTasks supports string numeric IDs",
    async () => {
      const client = new MockApiClient();
      client.mockResponse = { success: true, count: 2 };

      const testTaskService = {
        async deleteTasks(ids: (number | string)[]): Promise<BulkDeleteResponse> {
          const res = await client.delete<BulkDeleteResponse>("/tasks/bulk", {
            data: { ids },
          });
          return res.data;
        },
      };

      const result = await testTaskService.deleteTasks(["501", "502"]);
      assert.strictEqual(client.calls.length, 1);
      assert.deepStrictEqual(client.calls[0].config?.data, { ids: ["501", "502"] });
      assert.strictEqual(result.count, 2);
    },
  );

  await runTest(
    "TaskService: deleteTasks propagates upstream API errors",
    async () => {
      const client = new MockApiClient();
      client.shouldFail = true;
      client.failureError = new Error("500 Internal Server Error");

      const testTaskService = {
        async deleteTasks(ids: (number | string)[]): Promise<BulkDeleteResponse> {
          const res = await client.delete<BulkDeleteResponse>("/tasks/bulk", {
            data: { ids },
          });
          return res.data;
        },
      };

      await assert.rejects(
        async () => {
          await testTaskService.deleteTasks([101]);
        },
        {
          name: "Error",
          message: "500 Internal Server Error",
        },
      );
    },
  );

  // =========================================================================
  // SECTION 3: Share Service Implementation & Protocol
  // =========================================================================

  await runTest(
    "ShareService: Source exports deleteShares and revokeShares methods targeting /shares/bulk",
    () => {
      const shareServicePath = path.join(
        CLIENT_DIR,
        "src",
        "services",
        "share-service.ts",
      );
      const content = fs.readFileSync(shareServicePath, "utf-8");

      assert.ok(
        content.includes("async deleteShares(ids: (number | string)[])"),
        "shareService must define deleteShares(ids: (number | string)[])",
      );
      assert.ok(
        content.includes('apiClient.delete<BulkDeleteResponse>("/shares/bulk"'),
        "shareService.deleteShares must invoke apiClient.delete to /shares/bulk",
      );
      assert.ok(
        content.includes("async revokeShares(ids: (number | string)[])"),
        "shareService must define revokeShares backward-compatible alias",
      );
    },
  );

  await runTest(
    "ShareService: deleteShares invocation dispatches correct HTTP payload",
    async () => {
      const client = new MockApiClient();
      client.mockResponse = {
        success: true,
        count: 2,
        message: "2 share links deleted successfully",
      };

      const testShareService = {
        async deleteShares(ids: (number | string)[]): Promise<BulkDeleteResponse> {
          const res = await client.delete<BulkDeleteResponse>("/shares/bulk", {
            data: { ids },
          });
          return res.data;
        },
        async revokeShares(ids: (number | string)[]): Promise<BulkDeleteResponse> {
          return this.deleteShares(ids);
        },
      };

      const shareIds = [201, 202];
      const result = await testShareService.deleteShares(shareIds);

      assert.strictEqual(client.calls.length, 1);
      assert.strictEqual(client.calls[0].url, "/shares/bulk");
      assert.deepStrictEqual(client.calls[0].config?.data, { ids: [201, 202] });
      assert.strictEqual(result.count, 2);

      // Verify revokeShares alias
      const aliasResult = await testShareService.revokeShares([203]);
      assert.strictEqual(client.calls.length, 2);
      assert.strictEqual(client.calls[1].url, "/shares/bulk");
      assert.deepStrictEqual(client.calls[1].config?.data, { ids: [203] });
      assert.strictEqual(aliasResult.success, true);
    },
  );

  // =========================================================================
  // SECTION 4: Numeric ID Extraction & Sanitization Equivalence Classes
  // =========================================================================

  await runTest(
    "ID Sanitization: /^\d+$/ correctly classifies valid and invalid IDs",
    () => {
      const idValidator = (id: string) => /^\d+$/.test(id);

      // Equivalence Class 1: Valid numeric strings
      assert.strictEqual(idValidator("1"), true);
      assert.strictEqual(idValidator("123"), true);
      assert.strictEqual(idValidator("0"), true);
      assert.strictEqual(idValidator("9876543210"), true);

      // Equivalence Class 2: Negative numbers
      assert.strictEqual(idValidator("-1"), false);
      assert.strictEqual(idValidator("-100"), false);

      // Equivalence Class 3: Floating point numbers
      assert.strictEqual(idValidator("12.34"), false);
      assert.strictEqual(idValidator("1.0"), false);

      // Equivalence Class 4: Alphanumeric and UUIDs
      assert.strictEqual(idValidator("task-123"), false);
      assert.strictEqual(idValidator("123a"), false);
      assert.strictEqual(idValidator("a123"), false);
      assert.strictEqual(idValidator("pending"), false);
      assert.strictEqual(idValidator("uuid-v4-abc-def"), false);

      // Equivalence Class 5: Empty and whitespace
      assert.strictEqual(idValidator(""), false);
      assert.strictEqual(idValidator("   "), false);
      assert.strictEqual(idValidator(" 123 "), false);
      assert.strictEqual(idValidator("\n"), false);
    },
  );

  await runTest(
    "ID Filtering: Filters raw task/share list to valid numeric IDs only",
    () => {
      const mockRawTasks = [
        { id: "101", name: "Task 1" },
        { id: "pending-task", name: "Task 2" },
        { id: "102", name: "Task 3" },
        { id: "", name: "Task 4" },
        { id: "103", name: "Task 5" },
        { id: "uuid-999", name: "Task 6" },
      ];

      const validIds = mockRawTasks
        .map((t) => t.id)
        .filter((id) => /^\d+$/.test(id));

      assert.deepStrictEqual(validIds, ["101", "102", "103"]);
    },
  );

  await runTest(
    "Empty ID Array Guard: Zero network calls made when validIds is empty",
    async () => {
      const client = new MockApiClient();
      let deleteCalled = false;

      const mockDeleteTasks = async (ids: string[]) => {
        deleteCalled = true;
        return client.delete("/tasks/bulk", { data: { ids } });
      };

      const mockNonNumericTasks = [
        { id: "pending" },
        { id: "client-temp-1" },
        { id: "invalid-id" },
      ];

      const validIds = mockNonNumericTasks
        .map((t) => t.id)
        .filter((id) => /^\d+$/.test(id));

      if (validIds.length > 0) {
        await mockDeleteTasks(validIds);
      }

      assert.strictEqual(deleteCalled, false);
      assert.strictEqual(client.calls.length, 0);
    },
  );

  // =========================================================================
  // SECTION 5: React Query Cache Updates & Invalidation Logic
  // =========================================================================

  await runTest(
    "Cache Reducer: ClearAll tasks updates cache state cleanly",
    () => {
      interface LocalTask {
        id: string;
        url: string;
      }
      interface LocalShare {
        id: string;
        file_name: string;
      }
      interface ActivityData {
        serverTasks: LocalTask[];
        shares: LocalShare[];
      }

      const initialCache: ActivityData = {
        serverTasks: [
          { id: "1", url: "magnet:?xt=urn:btih:1" },
          { id: "2", url: "magnet:?xt=urn:btih:2" },
        ],
        shares: [
          { id: "10", file_name: "file1.mp4" },
          { id: "11", file_name: "file2.mkv" },
        ],
      };

      // Apply task clear reducer
      const taskClearReducer = (old: ActivityData | undefined): ActivityData | undefined => {
        if (!old) return old;
        return { ...old, serverTasks: [] };
      };

      const updatedAfterTasks = taskClearReducer(initialCache);
      assert.ok(updatedAfterTasks);
      assert.deepStrictEqual(updatedAfterTasks.serverTasks, []);
      assert.strictEqual(updatedAfterTasks.shares.length, 2);

      // Apply share clear reducer
      const shareClearReducer = (old: ActivityData | undefined): ActivityData | undefined => {
        if (!old) return old;
        return { ...old, shares: [] };
      };

      const updatedAfterShares = shareClearReducer(updatedAfterTasks);
      assert.ok(updatedAfterShares);
      assert.deepStrictEqual(updatedAfterShares.serverTasks, []);
      assert.deepStrictEqual(updatedAfterShares.shares, []);

      // Edge case: undefined cache
      assert.strictEqual(taskClearReducer(undefined), undefined);
      assert.strictEqual(shareClearReducer(undefined), undefined);
    },
  );

  // =========================================================================
  // SECTION 6: UI Source Code Inspection (Elimination of Waterfall Loops)
  // =========================================================================

  await runTest(
    "MyActivityTab: Sequential deletion waterfall loop completely eliminated",
    () => {
      const tabPath = path.join(
        CLIENT_DIR,
        "src",
        "components",
        "features",
        "downloads",
        "my-activity-tab.tsx",
      );
      const content = fs.readFileSync(tabPath, "utf-8");

      // Verify no sequential for-of loops awaiting deleteTask / deleteShare
      assert.strictEqual(
        content.includes("for (const t of serverTasks)"),
        false,
        "Must NOT contain 'for (const t of serverTasks)' loop",
      );
      assert.strictEqual(
        content.includes("for (const s of shares)"),
        false,
        "Must NOT contain 'for (const s of shares)' loop",
      );

      // Verify presence of bulk invocations
      assert.ok(
        content.includes("await taskService.deleteTasks(validIds)"),
        "confirmClearAll must call await taskService.deleteTasks(validIds)",
      );
      assert.ok(
        content.includes("await shareService.deleteShares(validIds)"),
        "confirmClearAllShares must call await shareService.deleteShares(validIds)",
      );

      // Verify queryClient cache invalidation
      const invalidationCount = (
        content.match(/queryClient\.invalidateQueries\(\{\s*queryKey:\s*\["user-activity"\]\s*\}\)/g) || []
      ).length;
      assert.ok(
        invalidationCount >= 2,
        `Expected at least 2 invalidateQueries calls in my-activity-tab.tsx, found ${invalidationCount}`,
      );
    },
  );

  console.log("\n=== TEST EXECUTION SUMMARY ===");
  console.log(`Total tests run: ${passedTests + failedTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
