/**
 * Utility functions for consistent time formatting across the application
 * Ensures all time displays use 24-hour format
 */

/**
 * Formats a date to time only in 24-hour format
 * @param date The date to format
 * @returns Formatted time string in 24-hour format
 */
export const formatTime24Hour = (date: Date | string | number): string => {
  try {
    const dateObj = new Date(date);

    return dateObj.toLocaleTimeString("en-CA", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return "Invalid Time";
  }
};

/**
 * Calculates the time remaining until a given date (UTC safe)
 * @param targetDate The target date to calculate time remaining until
 * @returns Formatted string showing time remaining (e.g., "2h 30m 15s")
 */
export const calculateTimeRemaining = (
  targetDate: Date | string | number,
): string => {
  try {
    let dateStr = targetDate.toString();
    // Fix double timezone suffix if present (e.g. from backend bug)
    if (typeof targetDate === "string" && targetDate.endsWith("+00:00Z")) {
      dateStr = targetDate.replace("+00:00Z", "Z");
    }
    const target = new Date(dateStr).getTime();
    const now = Date.now();

    let diff = target - now;

    const totalSeconds = Math.floor(diff / 1000); // Only flooring ONCE fixes the reset bug

    if (totalSeconds <= 10) return "Now";

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  } catch (error) {
    console.error("Error calculating time remaining:", error);
    return "Invalid Date";
  }
};
