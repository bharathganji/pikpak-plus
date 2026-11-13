/**
 * Test Suite: SEO Maintenance Mode & Google Indexing Preservation
 *
 * Verifies that during scheduled maintenance (including extended windows such as 10 days),
 * Googlebot indexing for the homepage (/) is NOT negatively impacted, adhering strictly
 * to Google Search Central guidelines:
 *
 * 1. Homepage (/) is NEVER redirected to /maintenance during maintenance; it continues serving HTTP 200.
 * 2. Homepage exports canonical URL (https://pikpak-plus.com) and explicit index/follow directives.
 * 3. Homepage embeds Schema.org JSON-LD structured data for permanent search identity.
 * 4. Homepage displays an informative, accessible MaintenanceBanner during maintenance.
 * 5. /maintenance route exports strict robots noindex, nofollow metadata to prevent search engine indexing.
 * 6. robots.ts disallows /maintenance while explicitly allowing /.
 * 7. Next.js 16 Edge Proxy (proxy.ts) preserves public safe routes (/, /faq, /robots.txt, /sitemap.xml).
 * 8. Centralized maintenance configuration supports configurable window duration (defaulting to 10 days).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIR = path.resolve(__dirname, "..");

console.log(
  "=== STARTING SEO MAINTENANCE & GOOGLE INDEXING PRESERVATION TEST SUITE ===",
);

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
  const homePath = path.join(CLIENT_DIR, "src", "app", "page.tsx");
  assert.ok(fs.existsSync(homePath), "page.tsx must exist");
  const homeSource = fs.readFileSync(homePath, "utf-8");

  const proxyPath = path.join(CLIENT_DIR, "src", "proxy.ts");
  assert.ok(fs.existsSync(proxyPath), "proxy.ts must exist");
  const proxySource = fs.readFileSync(proxyPath, "utf-8");

  const robotsPath = path.join(CLIENT_DIR, "src", "app", "robots.ts");
  assert.ok(fs.existsSync(robotsPath), "robots.ts must exist");
  const robotsSource = fs.readFileSync(robotsPath, "utf-8");

  const maintenanceLayoutPath = path.join(
    CLIENT_DIR,
    "src",
    "app",
    "maintenance",
    "layout.tsx",
  );
  assert.ok(
    fs.existsSync(maintenanceLayoutPath),
    "maintenance/layout.tsx must exist",
  );
  const maintenanceLayoutSource = fs.readFileSync(
    maintenanceLayoutPath,
    "utf-8",
  );

  const maintenanceBannerPath = path.join(
    CLIENT_DIR,
    "src",
    "components",
    "maintenance-banner.tsx",
  );
  assert.ok(
    fs.existsSync(maintenanceBannerPath),
    "maintenance-banner.tsx must exist",
  );
  const maintenanceBannerSource = fs.readFileSync(
    maintenanceBannerPath,
    "utf-8",
  );

  const maintenanceConfigPath = path.join(
    CLIENT_DIR,
    "src",
    "lib",
    "maintenance-config.ts",
  );
  assert.ok(
    fs.existsSync(maintenanceConfigPath),
    "maintenance-config.ts must exist",
  );
  const maintenanceConfigSource = fs.readFileSync(
    maintenanceConfigPath,
    "utf-8",
  );

  // --- Suite 1: Homepage SEO & Canonical Metadata ---
  await runTest(
    "Homepage: Exports canonical URL to anchor Google index",
    () => {
      assert.match(
        homeSource,
        /canonical:\s*["']https:\/\/pikpak-plus\.com["']/,
        "Homepage metadata must define canonical URL 'https://pikpak-plus.com'",
      );
    },
  );

  await runTest(
    "Homepage: Explicitly permits indexing & following by search engines",
    () => {
      assert.match(
        homeSource,
        /robots:\s*\{[\s\S]*?index:\s*true[\s\S]*?follow:\s*true/,
        "Homepage must define robots with index: true and follow: true",
      );
    },
  );

  await runTest("Homepage: Embeds Schema.org JSON-LD structured data", () => {
    assert.match(
      homeSource,
      /type=["']application\/ld\+json["']/,
      "Homepage must contain structured data script tag",
    );
    assert.match(
      homeSource,
      /@type["']?:\s*["']WebSite["']/,
      "Structured data must declare WebSite entity",
    );
    assert.match(
      homeSource,
      /@type["']?:\s*["']SoftwareApplication["']/,
      "Structured data must declare SoftwareApplication entity",
    );
  });

  await runTest(
    "Homepage: Integrates MaintenanceBanner during maintenance mode",
    () => {
      assert.match(
        homeSource,
        /import\s*\{\s*MaintenanceBanner\s*\}\s*from\s*["']@\/components\/maintenance-banner["']/,
        "Homepage must import MaintenanceBanner",
      );
      assert.match(
        homeSource,
        /\{isMaintenanceMode\s*&&\s*<MaintenanceBanner\s*\/>\}/,
        "Homepage must render MaintenanceBanner when isMaintenanceMode is active",
      );
    },
  );

  // --- Suite 2: Maintenance Route Anti-Indexing Protection ---
  await runTest(
    "Maintenance Route: Strict noindex and nofollow in layout metadata",
    () => {
      assert.match(
        maintenanceLayoutSource,
        /robots:\s*\{[\s\S]*?index:\s*false[\s\S]*?follow:\s*false/,
        "Maintenance layout must declare index: false and follow: false",
      );
      assert.match(
        maintenanceLayoutSource,
        /googleBot:\s*\{[\s\S]*?index:\s*false[\s\S]*?follow:\s*false/,
        "Maintenance layout must explicitly instruct googleBot not to index or follow",
      );
    },
  );

  // --- Suite 3: Robots.txt Search Engine Crawling Directives ---
  await runTest(
    "Robots.txt: Allows homepage / while disallowing /maintenance",
    () => {
      assert.match(
        robotsSource,
        /allow:\s*["']\/["']/,
        "robots.ts must allow root '/'",
      );
      assert.match(
        robotsSource,
        /["']\/maintenance["']/,
        "robots.ts must include '/maintenance' in disallow rules",
      );
    },
  );

  // --- Suite 4: Edge Proxy Maintenance Bypass for Homepage & Safe Routes ---
  await runTest(
    "Proxy: Homepage / is NOT redirected during maintenance",
    () => {
      assert.match(
        proxySource,
        /pathname\s*===\s*["']\/["']/,
        "proxy.ts must recognize '/' as a public maintenance-safe route",
      );
      assert.match(
        proxySource,
        /if\s*\(!isPublicMaintenanceSafe\)\s*\{[\s\S]*?NextResponse\.redirect/,
        "proxy.ts must only redirect non-safe routes to /maintenance",
      );
    },
  );

  await runTest("Proxy: Sets x-maintenance-mode header downstream", () => {
    assert.match(
      proxySource,
      /requestHeaders\.set\(["']x-maintenance-mode["'],\s*["']active["']\)/,
      "proxy.ts must set x-maintenance-mode header for safe routes during maintenance",
    );
  });

  await runTest(
    "Proxy: Recovers from /maintenance back to / when system is healthy",
    () => {
      assert.match(
        proxySource,
        /else\s+if\s*\(pathname\s*===\s*["']\/maintenance["']\)\s*\{[\s\S]*?const url = new URL\(["']\/["'],\s*request\.nextUrl\);[\s\S]*?return NextResponse\.redirect\(url\);/,
        "proxy.ts must redirect from /maintenance to / when server is healthy and not in maintenance",
      );
    },
  );

  await runTest(
    "Proxy: Prevents forced dashboard redirects during maintenance",
    () => {
      assert.match(
        proxySource,
        /!isUnderMaintenance\s*&&\s*\(isAuthPage\s*\|\|\s*pathname\s*===\s*["']\/["']\)\s*&&\s*token/,
        "proxy.ts must check !isUnderMaintenance before redirecting authenticated users to /dashboard",
      );
    },
  );

  // --- Suite 5: Maintenance Configuration & Banner UX ---
  await runTest("Config: Defaults to 10-day maintenance window", () => {
    assert.match(
      maintenanceConfigSource,
      /process\.env\.NEXT_PUBLIC_MAINTENANCE_DURATION\)\s*\|\|\s*["']10 Days["']/,
      "maintenance-config.ts must default to a 10 Days maintenance duration",
    );
  });

  await runTest(
    "Banner: Provides accessible role='status' and FAQ/Telegram links",
    () => {
      assert.match(
        maintenanceBannerSource,
        /role=["']status["']/,
        "MaintenanceBanner must have role='status' for accessibility",
      );
      assert.match(
        maintenanceBannerSource,
        /href=["']\/faq["']/,
        "MaintenanceBanner must provide link to /faq",
      );
      assert.match(
        maintenanceBannerSource,
        /config\.telegramUrl/,
        "MaintenanceBanner must link to Telegram updates",
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
  console.error("Test runner encountered unexpected error:", err);
  process.exit(1);
});
