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

interface DownstreamTrafficChartProps {
  chartData: Array<Record<string, unknown>>;
}

export function DownstreamTrafficChart({
  chartData,
}: Readonly<DownstreamTrafficChartProps>) {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1 transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle>Downstream Traffic</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <defs>
                <linearGradient
                  id="colorDownstream"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fbbf24" />
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
                labelFormatter={(date: unknown) =>
                  format(new Date(date as string | number | Date), "PPP")
                }
                formatter={(value: unknown, name: unknown) => [
                  formatBytes(typeof value === "number" ? value : 0),
                  name === "downstream_traffic_predicted"
                    ? "Predicted Traffic"
                    : "Downstream Traffic",
                ]}
                contentStyle={tooltipStyle}
              />
              <Legend iconType="circle" />
              <Line
                type="monotone"
                dataKey="downstream_traffic"
                name="Downstream Traffic"
                stroke="url(#colorDownstream)"
                strokeWidth={3}
                dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
                activeDot={{ r: 8, fill: "#f59e0b", strokeWidth: 0 }}
                animationDuration={1500}
              />
              <Line
                type="monotone"
                dataKey="downstream_traffic_predicted"
                name="Predicted"
                stroke="#f59e0b"
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 6, fill: "#f59e0b", strokeWidth: 0 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
