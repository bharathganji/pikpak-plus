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

export const tooltipStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.8)",
  borderRadius: "12px",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
  backdropFilter: "blur(8px)",
  color: "#333",
};
