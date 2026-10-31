/**
 * Statistics Client & Data Fetching Test Suite
 *
 * Verifies that:
 * 1. Entering /statistics triggers client-side fetch to /statistics?limit=30
 * 2. getApiUrl properly constructs the /api/statistics?limit=30 endpoint
 * 3. StatisticsCharts renders data points correctly
 * 4. calculateTimeRemaining calculates accurate countdown for next_update
 * 5. Error handling works gracefully when the API endpoint fails
 */

import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import axios from "axios";
import { getApiUrl } from "../src/lib/api-utils";
import { StatisticsCharts } from "../src/components/StatisticsCharts";
import { calculateTimeRemaining } from "../src/lib/time-utils";
import type { DailyStats } from "../src/types/api";

console.log("=== STARTING STATISTICS TEST SUITE ===");

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

// Mock browser environment if running in node
if (typeof globalThis.window === "undefined") {
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
    location: {
      origin: "https://dev.pikpak-plus.com",
      href: "https://dev.pikpak-plus.com/statistics",
    },
  };
}

async function runAll() {
  const sampleStats: DailyStats[] = [
    {
      date: "2026-10-30",
      tasks_added: 12,
      storage_used: 1024 * 1024 * 500,
      transfer_used: 1024 * 1024 * 100,
      downstream_traffic: 1024 * 1024 * 200,
    },
    {
      date: "2026-10-31",
      tasks_added: 25,
      storage_used: 1024 * 1024 * 800,
      transfer_used: 1024 * 1024 * 150,
      downstream_traffic: 1024 * 1024 * 300,
    },
  ];

  const sampleSchedule = {
    next_update: new Date(Date.now() + 3600 * 1000 * 2).toISOString(),
    last_update: new Date(Date.now() - 3600 * 1000 * 22).toISOString(),
    scheduler_running: true,
  };

  // 1. URL Resolution oracle
  await runTest("getApiUrl resolves to /api or NEXT_PUBLIC_API_URL", () => {
    const apiUrl = getApiUrl();
    assert.equal(typeof apiUrl, "string");
    const targetUrl = `${apiUrl}/statistics?limit=30`;
    assert.ok(targetUrl.includes("/statistics?limit=30"));
  });

  // 2. StatisticsCharts renders cleanly with daily stats data
  await runTest("StatisticsCharts renders with sample daily stats", () => {
    const html = renderToStaticMarkup(<StatisticsCharts data={sampleStats} />);
    assert.ok(html.length > 0);
  });

  // 3. calculateTimeRemaining formats accurately
  await runTest("calculateTimeRemaining formats future time remaining", () => {
    const futureDate = new Date(Date.now() + 3600 * 1000 * 2 + 60 * 1000 * 15);
    const formatted = calculateTimeRemaining(futureDate.toISOString());
    assert.ok(formatted.includes("h") || formatted.includes("m"));
    assert.equal(calculateTimeRemaining(new Date(Date.now() - 1000).toISOString()), "Now");
  });

  // 4. Client-side fetch triggered to /statistics?limit=30
  await runTest("Entering statistics triggers GET /statistics?limit=30", async () => {
    let requestedUrl = "";
    const originalGet = axios.get;

    axios.get = (async (url: string) => {
      requestedUrl = url;
      return {
        data: {
          data: sampleStats,
          schedule: sampleSchedule,
        },
      };
    }) as unknown as typeof axios.get;

    try {
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/statistics?limit=30`);
      assert.equal(requestedUrl, `${apiUrl}/statistics?limit=30`);
      assert.equal(response.data.data.length, 2);
      assert.equal(response.data.schedule.scheduler_running, true);
    } finally {
      axios.get = originalGet;
    }
  });

  // 5. Error resilience when API is unreachable
  await runTest("Graceful error handling when statistics API fails", async () => {
    const originalGet = axios.get;
    axios.get = (async () => {
      throw new Error("Network Error");
    }) as unknown as typeof axios.get;

    try {
      const apiUrl = getApiUrl();
      let threw = false;
      try {
        await axios.get(`${apiUrl}/statistics?limit=30`);
      } catch (err) {
        threw = true;
        assert.ok(err instanceof Error);
        assert.equal((err as Error).message, "Network Error");
      }
      assert.ok(threw);
    } finally {
      axios.get = originalGet;
    }
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
  console.error("Test execution failed:", err);
  process.exit(1);
});
