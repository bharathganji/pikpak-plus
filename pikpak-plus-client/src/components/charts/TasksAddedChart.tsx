"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { tooltipStyle } from "./utils";

interface TasksAddedChartProps {
  chartData: Array<Record<string, unknown>>;
}

export function TasksAddedChart({ chartData }: Readonly<TasksAddedChartProps>) {
  return (
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
                labelFormatter={(date: unknown) => format(new Date(date as string | number | Date), "PPP")}
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
  );
}
