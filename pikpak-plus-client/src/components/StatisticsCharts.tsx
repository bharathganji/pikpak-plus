"use client";

import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface DailyStat {
  date: string;
  tasks_added: number;
  storage_used: number;
  transfer_used: number;
  downstream_traffic: number;
  is_predicted?: boolean;
}

interface StatisticsChartsProps {
  data: DailyStat[];
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = Math.max(decimals, 0);
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  );
};

export function StatisticsCharts({ data }: Readonly<StatisticsChartsProps>) {
  // Sort data by date ascending for charts
  const rawData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Process data to separate actual vs predicted for continuity
  const chartData = rawData.map((item, index) => {
    const isPredicted = item.is_predicted;
    const prevItem = index > 0 ? rawData[index - 1] : null;

    // If this is the first predicted item, the previous item (actual) needs to start the predicted line
    // But Recharts requires the data to be row-based.
    // Strategy:
    // - Actual series: value if !isPredicted. If isPredicted, null.
    // - Predicted series: value if isPredicted.
    // - To connect them: The LAST actual item should have BOTH actual and predicted values.

    const newItem: any = { ...item };

    // Default all predicted to null initially
    newItem.tasks_added_predicted = null;
    newItem.storage_used_predicted = null;
    newItem.transfer_used_predicted = null;
    newItem.downstream_traffic_predicted = null;

    if (isPredicted) {
      // Move exact values to predicted fields
      newItem.tasks_added_predicted = newItem.tasks_added;
      newItem.tasks_added = null; // Hide from main series

      newItem.storage_used_predicted = newItem.storage_used;
      newItem.storage_used = null;

      newItem.transfer_used_predicted = newItem.transfer_used;
      newItem.transfer_used = null;

      newItem.downstream_traffic_predicted = newItem.downstream_traffic;
      newItem.downstream_traffic = null;
    }

    return newItem;
  });

  // Second pass: Connect the lines.
  // Find the last actual item and set its predicted values to its actual values
  // so the predicted line starts from there.
  for (let i = 0; i < chartData.length - 1; i++) {
    if (!chartData[i].is_predicted && chartData[i + 1].is_predicted) {
      chartData[i].tasks_added_predicted = chartData[i].tasks_added;
      chartData[i].storage_used_predicted = chartData[i].storage_used;
      chartData[i].transfer_used_predicted = chartData[i].transfer_used;
      chartData[i].downstream_traffic_predicted =
        chartData[i].downstream_traffic;
    }
  }

  const tooltipStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
    backdropFilter: "blur(8px)",
    color: "#333",
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Tasks Added Chart */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-1 transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle>Tasks Added Per Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
                  </linearGradient>
                  <pattern
                    id="patternTasksPredicted"
                    patternUnits="userSpaceOnUse"
                    width="4"
                    height="4"
                  >
                    <path
                      d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2"
                      stroke="#3b82f6"
                      strokeWidth="1"
                    />
                  </pattern>
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
                  allowDecimals={false}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip
                  labelFormatter={(date) => format(new Date(date), "PPP")}
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                />
                <Legend iconType="circle" />
                <Bar
                  dataKey="tasks_added"
                  name="Tasks Added"
                  fill="url(#colorTasks)"
                  radius={[6, 6, 0, 0]}
                  animationDuration={1500}
                />
                <Bar
                  dataKey="tasks_added_predicted"
                  name="Predicted"
                  fill="url(#patternTasksPredicted)"
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  radius={[6, 6, 0, 0]}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Storage Used Chart */}
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

      {/* Cloud Download (Transfer) Chart */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-1 transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle>Cloud Download Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <defs>
                  <linearGradient
                    id="colorTransfer"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
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
                  labelFormatter={(date) => format(new Date(date), "PPP")}
                  formatter={(value: number, name: string) => [
                    formatBytes(value),
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

      {/* Downstream Traffic Chart */}
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
                  labelFormatter={(date) => format(new Date(date), "PPP")}
                  formatter={(value: number, name: string) => [
                    formatBytes(value),
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
    </div>
  );
}
