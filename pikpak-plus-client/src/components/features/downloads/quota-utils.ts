export const formatBytes = (bytes: number | string): string => {
  const numBytes =
    typeof bytes === "string" ? Number.parseInt(bytes, 10) : bytes;
  if (numBytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  return `${(numBytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

export const getProgressColor = (percent: number) => {
  if (percent >= 90)
    return "[&>div]:bg-gradient-to-r [&>div]:from-red-500 [&>div]:to-red-600";
  if (percent >= 70)
    return "[&>div]:bg-gradient-to-r [&>div]:from-yellow-500 [&>div]:to-yellow-600";
  return ""; // Default primary gradient
};
