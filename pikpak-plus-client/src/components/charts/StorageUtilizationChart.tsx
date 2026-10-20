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

interface StorageUtilizationChartProps {
  chartData: any[];
}

export function StorageUtilizationChart({ chartData }: Readonly<StorageUtilizationChartProps>) {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1 transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle>Storage Utilization</CardTitle>
      </CardHeader>
      <CardContent>
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
                labelFormatter={(date) => format(new Date(date), "PPP")}
                formatter={(value: number, name: string) => [
                  formatBytes(value),
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
