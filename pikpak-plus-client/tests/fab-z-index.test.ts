/**
 * Client Unit Test Suite: Floating Action Button (FAB) & Stacking Hierarchy
 *
 * Verifies:
 * 1. Fab component source exports Fab function component.
 * 2. Fab component includes high z-index (z-50) utility class.
 * 3. Fab component is positioned fixed at bottom-right (fixed bottom-8 right-8).
 * 4. Fab component targets Jackett search torrents URL with secure attributes.
 * 5. Fab component renders Search Torrents label and search icon.
 * 6. Fab component supports optional className prop via cn utility.
 * 7. Stacking order: Fab z-index (z-50) is greater than layout content and footer (z-10).
 * 8. Fab is integrated into DashboardLayout and StatisticsClient.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIR = path.resolve(__dirname, "..");

console.log("=== STARTING FAB Z-INDEX & POSITIONING TEST SUITE ===");

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

async function runAll() {
  const fabPath = path.join(
    CLIENT_DIR,
    "src",
    "components",
    "layout",
    "fab.tsx",
  );
  assert.ok(fs.existsSync(fabPath), "fab.tsx must exist");
  const fabSource = fs.readFileSync(fabPath, "utf-8");

  await runTest("Fab: Component exports Fab function", () => {
    assert.match(
      fabSource,
      /export function Fab\s*\(/,
      "fab.tsx must export Fab function component",
    );
  });

  await runTest("Fab: Component specifies high z-index (z-50)", () => {
    assert.match(
      fabSource,
      /\bz-50\b/,
      "Fab component must include high z-index class 'z-50'",
    );
  });

  await runTest(
    "Fab: Component positioned at bottom-right viewport anchor",
    () => {
      assert.match(
        fabSource,
        /\bfixed\b/,
        "Fab component must be fixed positioned",
      );
      assert.match(
        fabSource,
        /\bbottom-8\b/,
        "Fab component must have bottom-8 positioning",
      );
      assert.match(
        fabSource,
        /\bright-8\b/,
        "Fab component must have right-8 positioning",
      );
    },
  );

  await runTest(
    "Fab: Links to Jackett torrent search with secure rel attributes",
    () => {
      assert.match(
        fabSource,
        /href="https:\/\/jackett\.pikpak-plus\.com"/,
        "Fab component must link to https://jackett.pikpak-plus.com",
      );
      assert.match(
        fabSource,
        /target="_blank"/,
        "Fab component link must open in target _blank",
      );
      assert.match(
        fabSource,
        /rel="noopener noreferrer"/,
        "Fab component link must use rel noopener noreferrer",
      );
    },
  );

  await runTest("Fab: Displays Search Torrents label and Search icon", () => {
    assert.match(
      fabSource,
      /Search Torrents/,
      "Fab component must display 'Search Torrents' text",
    );
    assert.match(
      fabSource,
      /<Search\b/,
      "Fab component must render Search icon from lucide-react",
    );
  });

  await runTest("Fab: Supports optional className prop with cn merge", () => {
    assert.match(
      fabSource,
      /import\s*\{\s*cn\s*\}\s*from\s*["']@\/lib\/utils["']/,
      "Fab component must import cn utility",
    );
    assert.match(
      fabSource,
      /interface FabProps/,
      "Fab component must define FabProps interface",
    );
    assert.match(
      fabSource,
      /className\?: string/,
      "FabProps must allow optional className",
    );
  });

  await runTest(
    "Stacking Hierarchy: Fab z-50 elevates above dashboard content and footer z-10",
    () => {
      const layoutPath = path.join(
        CLIENT_DIR,
        "src",
        "app",
        "dashboard",
        "layout.tsx",
      );
      assert.ok(fs.existsSync(layoutPath), "dashboard layout.tsx must exist");
      const layoutSource = fs.readFileSync(layoutPath, "utf-8");

      assert.match(
        layoutSource,
        /<Footer\s+className="relative z-10"\s*\/>/,
        "Footer has relative z-10 stacking",
      );
      assert.match(
        layoutSource,
        /<Fab\s*\/>/,
        "DashboardLayout must include <Fab />",
      );
    },
  );

  await runTest("Integration: Statistics page includes Fab component", () => {
    const statsPath = path.join(
      CLIENT_DIR,
      "src",
      "app",
      "statistics",
      "statistics-client.tsx",
    );
    assert.ok(fs.existsSync(statsPath), "statistics-client.tsx must exist");
    const statsSource = fs.readFileSync(statsPath, "utf-8");

    assert.match(
      statsSource,
      /import\s*\{\s*Fab\s*\}\s*from\s*["']@\/components\/layout\/fab["']/,
      "StatisticsClient must import Fab",
    );
    assert.match(
      statsSource,
      /<Fab\s*\/>/,
      "StatisticsClient must render <Fab />",
    );
  });

  console.log("\n=== TEST EXECUTION SUMMARY ===");
  console.log(`Total tests run: ${passedTests + failedTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error("Test runner encountered unexpected error:", err);
  process.exit(1);
});
