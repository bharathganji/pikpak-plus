"use client";

import React from "react";
import { TasksAddedChart } from "./charts/TasksAddedChart";
import { StorageUtilizationChart } from "./charts/StorageUtilizationChart";
import { CloudDownloadUsageChart } from "./charts/CloudDownloadUsageChart";
import { DownstreamTrafficChart } from "./charts/DownstreamTrafficChart";

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

interface ChartDataPoint {
  date: string;
  tasks_added: number | null;
  storage_used: number | null;
  transfer_used: number | null;
  downstream_traffic: number | null;
  is_predicted?: boolean;
  tasks_added_predicted: number | null;
  storage_used_predicted: number | null;
  transfer_used_predicted: number | null;
  downstream_traffic_predicted: number | null;
  [key: string]: unknown;
}

export function StatisticsCharts({ data }: Readonly<StatisticsChartsProps>) {
  // Sort data by date ascending for charts
  const rawData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Process data to separate actual vs predicted for continuity
  const chartData: ChartDataPoint[] = rawData.map((item) => {
    const isPredicted = item.is_predicted;

    // If this is the first predicted item, the previous item (actual) needs to start the predicted line
    // But Recharts requires the data to be row-based.
    // Strategy:
    // - Actual series: value if !isPredicted. If isPredicted, null.
    // - Predicted series: value if isPredicted.
    // - To connect them: The LAST actual item should have BOTH actual and predicted values.

    const newItem: ChartDataPoint = {
      ...item,
      tasks_added_predicted: null,
      storage_used_predicted: null,
      transfer_used_predicted: null,
      downstream_traffic_predicted: null,
    };

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

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <TasksAddedChart chartData={chartData} />
      <StorageUtilizationChart chartData={chartData} />
      <CloudDownloadUsageChart chartData={chartData} />
      <DownstreamTrafficChart chartData={chartData} />
    </div>
  );
}
