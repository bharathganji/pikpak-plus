"use client";

import React from "react";
import {
  LineChart,
  Line,
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
import { CloudDownload } from "lucide-react";

interface CloudDownloadUsageChartProps {
  chartData: Array<Record<string, unknown>>;
}

export function CloudDownloadUsageChart({
  chartData,
}: Readonly<CloudDownloadUsageChartProps>) {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1 rounded-xl border-border/60 bg-card shadow-xs transition-all duration-300 hover:shadow-md hover:border-border/80">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <CloudDownload className="h-4 w-4 text-emerald-500" />
          <span>Cloud Download Usage</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <defs>
                <linearGradient id="colorTransfer" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
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
                  name === "transfer_used_predicted"
                    ? "Predicted Transfer"
                    : "Transfer Used",
                ]}
                contentStyle={tooltipStyle}
              />
              <Legend iconType="circle" />
              <Line
                type="monotone"
                dataKey="transfer_used"
                name="Transfer Used"
                stroke="url(#colorTransfer)"
                strokeWidth={3}
                dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                activeDot={{ r: 8, fill: "#10b981", strokeWidth: 0 }}
                animationDuration={1500}
              />
              <Line
                type="monotone"
                dataKey="transfer_used_predicted"
                name="Predicted"
                stroke="#10b981"
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 6, fill: "#10b981", strokeWidth: 0 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
