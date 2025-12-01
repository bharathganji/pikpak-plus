"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Fab } from "@/components/layout/fab";
import { StatisticsCharts } from "@/components/StatisticsCharts";
import { getApiUrl } from "@/lib/api-utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function StatisticsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/statistics?limit=30`);
      setData(response.data);
    } catch (err) {
      console.error("Failed to fetch statistics:", err);
      setError("Failed to load statistics. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center p-2 md:p-4 lg:p-8 bg-linear-to-b from-background to-muted/20 overflow-x-hidden w-full">
      <Header />

      <div className="w-full max-w-6xl mt-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Statistics Dashboard</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {error && (
          <div className="p-4 mb-6 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {data.length === 0 ? (
              <div className="text-center p-12 bg-card rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium mb-2">
                  No Statistics Available
                </h3>
                <p className="text-muted-foreground">
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
