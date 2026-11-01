/**
 * Empirical Adversarial Challenger Test Suite
 * Focus: Direct Download Elimination, component button contracts, layout symmetry, and lingering reference checks.
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

function runTest(
  name: string,
  fn: () => void | Promise<void>,
): Promise<void> | void {
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

  runTest(
    "FileExplorer Elimination: Directory src/components/features/files is completely removed",
    () => {
      const filesDir = path.join(
        CLIENT_DIR,
        "src",
        "components",
        "features",
        "files",
      );
      assert.strictEqual(
        fs.existsSync(filesDir),
        false,
        "features/files directory must not exist",
      );
    },
  );

  runTest(
    "FileExplorer Elimination: Zero imports or references in entire src/",
    () => {
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
      assert.deepStrictEqual(
        matches,
        [],
        `Found lingering references: ${JSON.stringify(matches)}`,
      );
    },
  );

  // =========================================================================
  // SECTION 2: fileService Direct Download Elimination & Metadata Contract
  // =========================================================================

  const { fileService } = await import("../src/services/file-service.js");
  const apiClient = (await import("../src/services/api-client.js")).default;

  const originalGet = apiClient.get;

  runTest(
    "fileService: getDownloadUrl and downloadFile methods are eliminated",
    () => {
      const service = fileService as Record<string, unknown>;
      assert.strictEqual(
        service.getDownloadUrl,
        undefined,
        "fileService.getDownloadUrl must not exist",
      );
      assert.strictEqual(
        service.downloadFile,
        undefined,
        "fileService.downloadFile must not exist",
      );
    },
  );

  await runTest(
    "fileService.getFile: Retains file metadata query capability",
    async () => {
      apiClient.get = async (url: string) => {
        assert.strictEqual(url, "/file/file_meta_123");
        return {
          data: {
            id: "file_meta_123",
            name: "test-video.mp4",
            size: 1048576,
          },
        } as any;
      };

      const res = await fileService.getFile("file_meta_123");
      assert.strictEqual(res.id, "file_meta_123");
      assert.strictEqual(res.name, "test-video.mp4");

      apiClient.get = originalGet;
    },
  );

  // =========================================================================
  // SECTION 3: Task Download Action Components Elimination Verification
  // =========================================================================

  runTest(
    "TaskItem (src/components/features/my-activity/task-item.tsx): Zero Direct Download References",
    () => {
      const itemPath = path.join(
        CLIENT_DIR,
        "src",
        "components",
        "features",
        "my-activity",
        "task-item.tsx",
      );
      const content = fs.readFileSync(itemPath, "utf-8");

      // 1. Must not import fileService
      assert.ok(
        !content.includes("file-service"),
        "TaskItem must not import fileService",
      );
      // 2. Must not contain handleDownload or downloadFile
      assert.ok(
        !content.includes("handleDownload"),
        "TaskItem must not define handleDownload",
      );
      assert.ok(
        !content.includes("downloadFile"),
        "TaskItem must not call downloadFile",
      );
      // 3. Must not render Direct Download button
      assert.ok(
        !content.includes('title="Direct Download"'),
        "TaskItem must not render Direct Download button",
      );
      assert.ok(
        !content.includes("Direct Download"),
        "TaskItem must not contain 'Direct Download' copy",
      );
    },
  );

  runTest(
    "TaskCard (src/components/features/create-share/task-card.tsx): Zero Direct Download References",
    () => {
      const cardPath = path.join(
        CLIENT_DIR,
        "src",
        "components",
        "features",
        "create-share",
        "task-card.tsx",
      );
      const content = fs.readFileSync(cardPath, "utf-8");

      // 1. Must not import fileService
      assert.ok(
        !content.includes("file-service"),
        "TaskCard must not import fileService",
      );
      // 2. Must not contain handleDirectDownload or downloadFile
      assert.ok(
        !content.includes("handleDirectDownload"),
        "TaskCard must not define handleDirectDownload",
      );
      assert.ok(
        !content.includes("downloadFile"),
        "TaskCard must not call downloadFile",
      );
      // 3. Must not render Direct Download button
      assert.ok(
        !content.includes('title="Direct Download"'),
        "TaskCard must not render Direct Download button",
      );
      assert.ok(
        !content.includes("Direct Download"),
        "TaskCard must not contain 'Direct Download' copy",
      );
    },
  );

  runTest(
    "FileDetails (src/components/features/create-share/file-details.tsx): Zero Direct Download References",
    () => {
      const detailsPath = path.join(
        CLIENT_DIR,
        "src",
        "components",
        "features",
        "create-share",
        "file-details.tsx",
      );
      const content = fs.readFileSync(detailsPath, "utf-8");

      // 1. Must not import fileService
      assert.ok(
        !content.includes("file-service"),
        "FileDetails must not import fileService",
      );
      // 2. Must not contain downloadFile
      assert.ok(
        !content.includes("downloadFile"),
        "FileDetails must not call downloadFile",
      );
      // 3. Must not render Direct Download button
      assert.ok(
        !content.includes("Direct Download"),
        "FileDetails must not contain 'Direct Download' copy",
      );
    },
  );

  // =========================================================================
  // SECTION 4: Layout Grid Symmetry & Dashboard Routing Architecture Validation
  // =========================================================================

  runTest(
    "Layout: DashboardNav matches exact 3-column configuration and routed URLs",
    () => {
      const navPath = path.join(
        CLIENT_DIR,
        "src",
        "components",
        "layout",
        "dashboard-nav.tsx",
      );
      assert.strictEqual(
        fs.existsSync(navPath),
        true,
        "dashboard-nav.tsx must exist",
      );
      const content = fs.readFileSync(navPath, "utf-8");

      // 1. Check grid class
      assert.ok(
        content.includes("grid-cols-3"),
        "DashboardNav must use grid-cols-3 for symmetric 3-column layout",
      );
      assert.ok(
        !content.includes("grid-cols-4"),
        "DashboardNav must NOT use grid-cols-4",
      );

      // 2. Count DASHBOARD_NAV_ITEMS links
      assert.ok(
        content.includes('href: "/dashboard"'),
        "Must include /dashboard route",
      );
      assert.ok(
        content.includes('href: "/dashboard/downloads"'),
        "Must include /dashboard/downloads route",
      );
      assert.ok(
        content.includes('href: "/dashboard/activity"'),
        "Must include /dashboard/activity route",
      );
      assert.ok(!content.includes("/files"), "Must not contain /files route");
    },
  );

  runTest(
    "Layout: Dedicated Dashboard route files exist and isolate views",
    () => {
      const dashPage = path.join(
        CLIENT_DIR,
        "src",
        "app",
        "dashboard",
        "page.tsx",
      );
      const downloadsPage = path.join(
        CLIENT_DIR,
        "src",
        "app",
        "dashboard",
        "downloads",
        "page.tsx",
      );
      const activityPage = path.join(
        CLIENT_DIR,
        "src",
        "app",
        "dashboard",
        "activity",
        "page.tsx",
      );
      const rootPage = path.join(CLIENT_DIR, "src", "app", "page.tsx");

      assert.strictEqual(
        fs.existsSync(dashPage),
        true,
        "dashboard/page.tsx must exist",
      );
      assert.strictEqual(
        fs.existsSync(downloadsPage),
        true,
        "dashboard/downloads/page.tsx must exist",
      );
      assert.strictEqual(
        fs.existsSync(activityPage),
        true,
        "dashboard/activity/page.tsx must exist",
      );
      assert.strictEqual(
        fs.existsSync(rootPage),
        true,
        "src/app/page.tsx must exist as landing page",
      );

      const rootContent = fs.readFileSync(rootPage, "utf-8");
      assert.ok(
        !rootContent.includes("Tabs defaultValue="),
        "Landing page must not cram operational tabs",
      );
    },
  );

  runTest(
    "Layout: my-activity-tab.tsx empty-state copy has no references to File Explorer",
    () => {
      const activityPath = path.join(
        CLIENT_DIR,
        "src",
        "components",
        "features",
        "downloads",
        "my-activity-tab.tsx",
      );
      const content = fs.readFileSync(activityPath, "utf-8");
      assert.ok(
        !content.toLowerCase().includes("file explorer"),
        "my-activity-tab.tsx must not contain any reference to File Explorer",
      );
    },
  );

  // =========================================================================
  // SECTION 5: Zero Lingering /file/download-url References in Client Source
  // =========================================================================

  runTest("Zero Lingering /file/download-url endpoints in entire src/", () => {
    function searchForEndpoint(dir: string, matches: string[]) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          searchForEndpoint(fullPath, matches);
        } else if (
          entry.isFile() &&
          /\.(tsx?|jsx?|css|json)$/.test(entry.name)
        ) {
          const content = fs.readFileSync(fullPath, "utf-8");
          if (
            content.includes("/file/download-url") ||
            content.includes("download-url")
          ) {
            matches.push(`Found lingering download-url in ${fullPath}`);
          }
        }
      }
    }

    const matches: string[] = [];
    searchForEndpoint(path.join(CLIENT_DIR, "src"), matches);
    assert.deepStrictEqual(
      matches,
      [],
      `Found lingering download-url references: ${JSON.stringify(matches)}`,
    );
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
