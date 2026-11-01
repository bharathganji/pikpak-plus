"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Fab } from "@/components/layout/fab";
import { StatisticsCharts } from "@/components/StatisticsCharts";
import { getApiUrl } from "@/lib/api-utils";
import { DailyStats } from "@/types/api";
import { calculateTimeRemaining } from "@/lib/time-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Clock, AlertCircle, BarChart3 } from "lucide-react";

export interface ScheduleInfo {
  next_update: string | null;
  last_update: string | null;
  scheduler_running: boolean;
}

export interface StatisticsResponse {
  data: DailyStats[];
  schedule: ScheduleInfo;
}

interface StatisticsClientProps {
  initialData?: DailyStats[];
  initialSchedule?: ScheduleInfo | null;
}

const fetchStatistics = async (): Promise<StatisticsResponse> => {
  const apiUrl = getApiUrl();
  const response = await axios.get<StatisticsResponse>(
    `${apiUrl}/statistics?limit=30`,
  );
  return response.data;
};

export function StatisticsClient({
  initialData = [],
  initialSchedule = null,
}: StatisticsClientProps) {
  const {
    data: statsResponse,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["statistics", 30],
    queryFn: fetchStatistics,
    initialData:
      initialData && initialData.length > 0
        ? {
            data: initialData,
            schedule: initialSchedule as ScheduleInfo,
          }
        : undefined,
  });

  const data = statsResponse?.data ?? [];
  const schedule = statsResponse?.schedule ?? null;
  const loading = isLoading;
  const error = queryError
    ? "Failed to load statistics. Please try again later."
    : "";

  return (
    <main className="flex min-h-screen flex-col items-center p-3 md:p-6 lg:p-8 bg-linear-to-b from-background via-muted/10 to-muted/20 overflow-x-hidden w-full">
      <Header />

      <div className="w-full max-w-6xl mt-4 sm:mt-6 mb-8 px-1 sm:px-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl border-border/60 hover:bg-muted/80 shadow-2xs transition-smooth hover-lift"
                aria-label="Back to home"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Statistics Dashboard
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                30-day telemetry, storage utilization, and task trends
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Next Update Indicator */}
            {schedule?.next_update && (
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground shadow-2xs backdrop-blur-xs">
                <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="hidden sm:inline font-medium">Next update:</span>
                <Badge
                  variant="secondary"
                  className="font-mono text-xs px-2 py-0.5 rounded-full bg-background/80 text-foreground border border-border/50"
                >
                  {calculateTimeRemaining(schedule.next_update)}
                </Badge>
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh statistics"
              className="h-9 w-9 rounded-xl border-border/60 hover:bg-muted/80 shadow-2xs transition-smooth hover-lift"
            >
              <RefreshCw
                className={`h-4 w-4 text-foreground/80 ${isFetching ? "animate-spin text-primary" : ""}`}
              />
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 text-destructive bg-destructive/10 rounded-xl border border-destructive/20 backdrop-blur-xs shadow-xs">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {loading && data.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-72 gap-3 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs shadow-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary"></div>
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading statistics telemetry...
            </p>
          </div>
        ) : (
          <>
            {data.length === 0 ? (
              <div className="text-center p-12 bg-card/80 backdrop-blur-xs rounded-xl border border-border/60 shadow-xs flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight mb-1 text-foreground">
                  No Statistics Available
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Statistics collection runs daily. Check back tomorrow!
                </p>
              </div>
            ) : (
              <StatisticsCharts data={data} />
            )}
          </>
        )}
      </div>

      <Footer />
      <Fab />
    </main>
  );
}
