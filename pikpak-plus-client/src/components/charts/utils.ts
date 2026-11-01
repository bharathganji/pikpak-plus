import type { CSSProperties } from "react";

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = Math.max(decimals, 0);
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  );
};

export const tooltipStyle: CSSProperties = {
  backgroundColor: "hsl(var(--card) / 0.85)",
  borderRadius: "12px",
  border: "1px solid hsl(var(--border) / 0.6)",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  color: "hsl(var(--card-foreground))",
  fontSize: "12px",
  padding: "8px 12px",
};

