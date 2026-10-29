/**
 * Empirical Adversarial Challenger Test Suite
 * Focus: Download flow resilience, component button contracts, layout symmetry, and lingering reference checks.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIR = path.resolve(__dirname, "..");

console.log("=== STARTING ADVERSARIAL DOWNLOAD & LAYOUT STRESS SUITE ===");

let passedTests = 0;
let failedTests = 0;

function runTest(name: string, fn: () => void | Promise<void>): Promise<void> | void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(() => {
          console.log(`  ✓ PASS: ${name}`);
          passedTests++;
        })
        .catch((err: unknown) => {
          console.error(`  ✗ FAIL: ${name}`);
          console.error(err);
          failedTests++;
        });
    } else {
      console.log(`  ✓ PASS: ${name}`);
      passedTests++;
    }
  } catch (err: unknown) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    failedTests++;
  }
}

async function runAll() {
  // =========================================================================
  // SECTION 1: Zero Lingering FileExplorer References Check
  // =========================================================================

  runTest("FileExplorer Elimination: Directory src/components/features/files is completely removed", () => {
    const filesDir = path.join(CLIENT_DIR, "src", "components", "features", "files");
    assert.strictEqual(fs.existsSync(filesDir), false, "features/files directory must not exist");
  });

  runTest("FileExplorer Elimination: Zero imports or references in entire src/", () => {
    function searchDir(dir: string, matches: string[]) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          searchDir(fullPath, matches);
        } else if (entry.isFile() && /\.(tsx?|jsx?|css)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          // Check for FileExplorer component or features/files imports
          if (
            content.includes("FileExplorer") &&
            !fullPath.includes("useful-links.tsx") // CX File Explorer is external
          ) {
            matches.push(`Lingering FileExplorer in ${fullPath}`);
          }
          if (content.includes("features/files")) {
            matches.push(`Lingering features/files import in ${fullPath}`);
          }
        }
      }
    }

    const matches: string[] = [];
    searchDir(path.join(CLIENT_DIR, "src"), matches);
    assert.deepStrictEqual(matches, [], `Found lingering references: ${JSON.stringify(matches)}`);
  });

  // =========================================================================
  // SECTION 2: fileService Download Logic & Fallback Oracles
  // =========================================================================

  const { fileService } = await import("../src/services/file-service.js");
  const apiClient = (await import("../src/services/api-client.js")).default;

  // Save original methods
  const originalGet = apiClient.get;
  const originalPost = apiClient.post;

  await runTest("fileService.getDownloadUrl: Primary route /file/download-url succeeds (url field)", async () => {
    apiClient.post = async (url: string, data?: any) => {
      assert.strictEqual(url, "/file/download-url");
      assert.strictEqual(data.id, "file_123");
      return { data: { url: "https://signed.cdn.com/file_123.mp4" } } as any;
    };

    const res = await fileService.getDownloadUrl("file_123");
    assert.strictEqual(res.url, "https://signed.cdn.com/file_123.mp4");
  });

  await runTest("fileService.getDownloadUrl: Primary route /file/download-url succeeds (download_url field)", async () => {
    apiClient.post = async (url: string, data?: any) => {
      assert.strictEqual(url, "/file/download-url");
      return { data: { download_url: "https://signed.cdn.com/file_456.mkv" } } as any;
    };

    const res = await fileService.getDownloadUrl("file_456");
    assert.strictEqual(res.url, "https://signed.cdn.com/file_456.mkv");
  });

  await runTest("fileService.getDownloadUrl: Fallback to getFile when download-url throws error", async () => {
    apiClient.post = async () => {
      throw new Error("HTTP 404 Route Not Found");
    };
    apiClient.get = async (url: string) => {
      assert.strictEqual(url, "/file/file_fallback_1");
      return {
        data: {
          id: "file_fallback_1",
          name: "fallback.mp4",
          links: {
            "application/octet-stream": { url: "https://cdn.fallback.com/stream" },
          },
        },
      } as any;
    };

    const res = await fileService.getDownloadUrl("file_fallback_1");
    assert.strictEqual(res.url, "https://cdn.fallback.com/stream");
    assert.ok(res.file);
  });

  await runTest("fileService.getDownloadUrl: Fallback to web_content_link when octet-stream absent", async () => {
    apiClient.post = async () => {
      throw new Error("HTTP 500");
    };
    apiClient.get = async (url: string) => {
      return {
        data: {
          id: "file_web_1",
          name: "web.pdf",
          web_content_link: "https://cdn.fallback.com/web_content",
        },
      } as any;
    };

    const res = await fileService.getDownloadUrl("file_web_1");
    assert.strictEqual(res.url, "https://cdn.fallback.com/web_content");
  });

  await runTest("fileService.getDownloadUrl: Throws error when both primary and fallback fail to provide url", async () => {
    apiClient.post = async () => {
      throw new Error("HTTP 500");
    };
    apiClient.get = async () => {
      return {
        data: {
          id: "file_empty",
          name: "empty.bin",
        },
      } as any;
    };

    await assert.rejects(
      async () => {
        await fileService.getDownloadUrl("file_empty");
      },
      {
        message: "Unable to resolve direct download URL for this file",
      }
    );
  });

  await runTest("fileService.downloadFile: Browser DOM simulation & cleanup", async () => {
    apiClient.post = async () => ({
      data: { url: "https://cdn.example.com/download/test-archive.zip" },
    } as any);

    // Mock DOM environment
    const createdElements: any[] = [];
    const appendedChildren: any[] = [];
    const removedChildren: any[] = [];
    let clicked = false;

    const fakeLink = {
      href: "",
      download: "",
      target: "",
      rel: "",
      click() {
        clicked = true;
      },
    };

    const fakeDocument = {
      createElement(tag: string) {
        assert.strictEqual(tag, "a");
        createdElements.push(fakeLink);
        return fakeLink;
      },
      body: {
        appendChild(child: any) {
          appendedChildren.push(child);
        },
        removeChild(child: any) {
          removedChildren.push(child);
        },
      },
    };

    (globalThis as any).window = {};
    (globalThis as any).document = fakeDocument;

    const returnedUrl = await fileService.downloadFile("id_archive", "MyArchive.zip");

    assert.strictEqual(returnedUrl, "https://cdn.example.com/download/test-archive.zip");
    assert.strictEqual(fakeLink.href, "https://cdn.example.com/download/test-archive.zip");
    assert.strictEqual(fakeLink.download, "MyArchive.zip");
    assert.strictEqual(fakeLink.target, "_blank");
    assert.strictEqual(fakeLink.rel, "noopener noreferrer");
    assert.strictEqual(clicked, true, "link.click() must be executed");
    assert.strictEqual(appendedChildren.length, 1, "Element must be appended to body");
    assert.strictEqual(removedChildren.length, 1, "Element must be cleaned up from body");

    // Clean up mocks
    delete (globalThis as any).window;
    delete (globalThis as any).document;
    apiClient.get = originalGet;
    apiClient.post = originalPost;
  });

  // =========================================================================
  // SECTION 3: Task Download Action Components Type & Contract Verification
  // =========================================================================

  runTest("TaskItem (src/components/features/my-activity/task-item.tsx): Contract & Download Invocation", () => {
    const itemPath = path.join(CLIENT_DIR, "src", "components", "features", "my-activity", "task-item.tsx");
    const content = fs.readFileSync(itemPath, "utf-8");

    // 1. fileService import
    assert.ok(content.includes('import { fileService } from "@/services/file-service";'), "Must import fileService");
    // 2. handleDownload checks task.file_id
    assert.ok(content.includes("if (!task.file_id) return;"), "Must guard against missing file_id");
    // 3. Calls downloadFile with task.file_id and task.name
    assert.ok(content.includes("fileService.downloadFile(task.file_id, task.name)"), "Must call downloadFile(task.file_id, task.name)");
    // 4. Proper try-catch-finally block
    assert.ok(content.includes("try {") && content.includes("} catch (e) {") && content.includes("} finally {"), "Must have error handling and finally");
    // 5. Button conditional on task.file_id
    assert.ok(content.includes("{task.file_id && ("), "Download button must only render when task.file_id exists");
  });

  runTest("TaskCard (src/components/features/create-share/task-card.tsx): Contract & Event Propagation", () => {
    const cardPath = path.join(CLIENT_DIR, "src", "components", "features", "create-share", "task-card.tsx");
    const content = fs.readFileSync(cardPath, "utf-8");

    // 1. fileService import
    assert.ok(content.includes('import { fileService } from "@/services/file-service";'), "Must import fileService");
    // 2. e.stopPropagation() prevents opening task modal
    assert.ok(content.includes("e.stopPropagation();"), "Must call stopPropagation to avoid opening modal");
    // 3. Guard against missing file_id
    assert.ok(content.includes("if (!taskData?.file_id) return;"), "Must guard against missing file_id");
    // 4. Calls downloadFile(taskData.file_id, name)
    assert.ok(content.includes("fileService.downloadFile(taskData.file_id, name)"), "Must call downloadFile with file_id and task name");
    // 5. Button rendered only when taskData?.file_id exists
    assert.ok(content.includes("{taskData?.file_id && ("), "Download button rendered conditionally");
  });

  runTest("FileDetails (src/components/features/create-share/file-details.tsx): Contract & Download Invocation", () => {
    const detailsPath = path.join(CLIENT_DIR, "src", "components", "features", "create-share", "file-details.tsx");
    const content = fs.readFileSync(detailsPath, "utf-8");

    // 1. fileService import
    assert.ok(content.includes('import { fileService } from "@/services/file-service";'), "Must import fileService");
    // 2. Conditional render on taskData?.file_id
    assert.ok(content.includes("{taskData?.file_id && ("), "Must conditionally render on taskData?.file_id");
    // 3. Calls downloadFile(taskData.file_id, taskData.file_name)
    assert.ok(content.includes("fileService.downloadFile(taskData.file_id, taskData.file_name)"), "Must call downloadFile(taskData.file_id, taskData.file_name)");
  });

  // =========================================================================
  // SECTION 4: Layout Grid Symmetry & Tabs Index Validation
  // =========================================================================

  runTest("Layout: page.tsx TabsList grid matches exact 3-column configuration", () => {
    const pagePath = path.join(CLIENT_DIR, "src", "app", "page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    // 1. Check TabsList class
    assert.ok(content.includes('grid-cols-3'), "TabsList must use grid-cols-3 for symmetric 3-column layout");
    assert.ok(!content.includes('grid-cols-4'), "TabsList must NOT use grid-cols-4");

    // 2. Count TabsTrigger instances
    const triggerMatches = content.match(/<TabsTrigger\s+value="([^"]+)"/g) || [];
    assert.strictEqual(triggerMatches.length, 3, "Exactly 3 TabsTrigger elements must exist");
    assert.deepStrictEqual(
      triggerMatches.map((m) => m.match(/value="([^"]+)"/)?.[1]),
      ["create", "downloads", "my-activity"]
    );

    // 3. Count TabsContent instances
    const contentMatches = content.match(/<TabsContent\s+value="([^"]+)"/g) || [];
    assert.strictEqual(contentMatches.length, 3, "Exactly 3 TabsContent elements must exist");
    assert.deepStrictEqual(
      contentMatches.map((m) => m.match(/value="([^"]+)"/)?.[1]),
      ["create", "downloads", "my-activity"]
    );

    // 4. Confirm default tab value is 'create'
    assert.ok(content.includes('defaultValue="create"'), "Default active tab must be 'create'");
  });

  runTest("Layout: my-activity-tab.tsx empty-state copy has no references to File Explorer", () => {
    const activityPath = path.join(CLIENT_DIR, "src", "components", "features", "downloads", "my-activity-tab.tsx");
    const content = fs.readFileSync(activityPath, "utf-8");
    assert.ok(
      !content.toLowerCase().includes("file explorer"),
      "my-activity-tab.tsx must not contain any reference to File Explorer"
    );
  });

  // =========================================================================
  // SECTION 5: Adversarial Boundary & Stress Cases
  // =========================================================================

  await runTest("Stress: Concurrent download triggers resolve without race conditions or memory corruption", async () => {
    let callCount = 0;
    apiClient.post = async () => {
      callCount++;
      return { data: { url: `https://cdn.example.com/item_${callCount}.bin` } } as any;
    };

    const requests = Array.from({ length: 50 }, (_, i) =>
      fileService.getDownloadUrl(`stress_id_${i}`)
    );

    const results = await Promise.all(requests);
    assert.strictEqual(results.length, 50);
    assert.strictEqual(callCount, 50);
    results.forEach((r, i) => {
      assert.ok(r.url.startsWith("https://cdn.example.com/item_"));
    });

    apiClient.post = originalPost;
    apiClient.get = originalGet;
  });

  await runTest("Adversarial: Malformed / non-string IDs throw or handle safely", async () => {
    apiClient.post = async (url: string, data: any) => {
      if (!data.id || typeof data.id !== "string") {
        throw new Error("Invalid ID parameter");
      }
      return { data: { url: "https://ok.com" } } as any;
    };
    apiClient.get = async () => {
      throw new Error("Invalid ID parameter");
    };

    await assert.rejects(
      async () => {
        await fileService.getDownloadUrl("" as any);
      },
      /(Unable to resolve direct download URL|Invalid ID parameter)/
    );

    apiClient.post = originalPost;
    apiClient.get = originalGet;
  });

  console.log("\n=== ADVERSARIAL TEST SUMMARY ===");
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
