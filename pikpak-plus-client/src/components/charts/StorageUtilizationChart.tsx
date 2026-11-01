"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { tooltipStyle, formatBytes } from "./utils";
import { Database } from "lucide-react";

interface StorageUtilizationChartProps {
  chartData: Array<Record<string, unknown>>;
}

export function StorageUtilizationChart({
  chartData,
}: Readonly<StorageUtilizationChartProps>) {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1 rounded-xl border-border/60 bg-card shadow-xs transition-all duration-300 hover:shadow-md hover:border-border/80">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Database className="h-4 w-4 text-purple-500" />
          <span>Storage Utilization</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.2}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => format(new Date(date), "MMM d")}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                tickFormatter={(value) => formatBytes(value, 0)}
                fontSize={12}
                width={80}
                tickLine={false}
                axisLine={false}
                dx={-10}
              />
              <Tooltip
                labelFormatter={(date: unknown) => format(new Date(date as string | number | Date), "PPP")}
                formatter={(value: unknown, name: unknown) => [
                  formatBytes(typeof value === "number" ? value : 0),
                  name === "storage_used_predicted"
                    ? "Predicted Storage"
                    : "Storage Used",
                ]}
                contentStyle={tooltipStyle}
              />
              <Legend iconType="circle" />
              <Area
                type="monotone"
                dataKey="storage_used"
                name="Storage Used"
                stroke="#8b5cf6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorStorage)"
                animationDuration={1500}
              />
              <Area
                type="monotone"
                dataKey="storage_used_predicted"
                name="Predicted"
                stroke="#8b5cf6"
                strokeWidth={3}
                strokeDasharray="5 5"
                fillOpacity={0.3}
                fill="url(#colorStorage)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
