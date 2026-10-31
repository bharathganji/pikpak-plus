import type { Metadata } from "next";
import { getServerApiUrl } from "@/lib/api-utils";
import { StatisticsClient, StatisticsResponse } from "./statistics-client";

export const metadata: Metadata = {
  title: "Statistics Dashboard - PikPak Plus",
  description:
    "Live system usage metrics, task processing analytics, and storage utilization trends on PikPak Plus.",
};

// Leverage Incremental Static Regeneration (ISR) with 60s revalidation window
export const revalidate = 60;

async function getInitialStatistics(): Promise<StatisticsResponse> {
  try {
    const apiUrl = getServerApiUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${apiUrl}/statistics?limit=30`, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        data: [],
        schedule: {
          next_update: null,
          last_update: null,
          scheduler_running: false,
        },
      };
    }
    return await res.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return {
      data: [],
      schedule: {
        next_update: null,
        last_update: null,
        scheduler_running: false,
      },
    };
  }
}

export default async function StatisticsPage() {
  const stats = await getInitialStatistics();

  return (
    <StatisticsClient
      initialData={stats.data || []}
      initialSchedule={stats.schedule || null}
    />
  );
}
