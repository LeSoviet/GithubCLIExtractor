/**
 * Standardized formatting utilities for consistent report output
 */

/**
 * Format a number as a percentage with 1 decimal place
 * @param value - Number to format (0-100)
 * @returns Formatted percentage string (e.g., "85.5%")
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return `${value.toFixed(1)}%`;
}

/**
 * Format a number as hours with 1 decimal place
 * @param value - Number of hours
 * @returns Formatted hours string (e.g., "12.5h")
 */
export function formatHours(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return `${value.toFixed(1)}h`;
}

/**
 * Format a number as days with 1 decimal place
 * @param value - Number of days
 * @returns Formatted days string (e.g., "3.5d")
 */
export function formatDays(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return `${value.toFixed(1)}d`;
}

/**
 * Format a count with no decimal places
 * @param value - Number to format
 * @returns Formatted count string (e.g., "1234")
 */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return `${Math.round(value)}`;
}

/**
 * Format a decimal number with 1 decimal place
 * @param value - Number to format
 * @returns Formatted number string (e.g., "12.5")
 */
export function formatDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return value.toFixed(1);
}

/**
 * Format a delta/change value with sign
 * @param value - Delta value
 * @returns Formatted delta string with arrow (e.g., "↑5.5%", "↓2.3%", "→0.0%")
 */
export function formatDelta(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '→';
  const absValue = Math.abs(value);
  return `${arrow}${absValue.toFixed(1)}%`;
}

/**
 * Format a trend indicator without emoji
 * @param value - Delta value
 * @returns Trend description (e.g., "Improving", "Declining", "Stable")
 */
export function formatTrend(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'Unknown';
  }

  if (value > 0) return 'Improving';
  if (value < 0) return 'Declining';
  return 'Stable';
}

/**
 * Format a large number with K/M suffix
 * @param value - Number to format
 * @returns Formatted number string (e.g., "1.5K", "2.3M")
 */
export function formatLargeNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return formatCount(value);
}
