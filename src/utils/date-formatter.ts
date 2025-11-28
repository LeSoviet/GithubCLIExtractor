import { format, parseISO } from 'date-fns';

/**
 * Format a date string to a human-readable format
 * Uses date-fns for consistent formatting across the application
 */
export function formatDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'PPpp'); // Example: Jan 1, 2025, 12:30 PM
  } catch {
    // Fallback to ISO string if parsing fails
    return typeof dateString === 'string' ? dateString : dateString.toISOString();
  }
}

/**
 * Format a date string to a short format
 * Example: Jan 1, 2025
 */
export function formatDateShort(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'PPP'); // Jan 1, 2025
  } catch {
    return typeof dateString === 'string' ? dateString : dateString.toISOString();
  }
}

/**
 * Format a date string to a full format with time
 * Example: Monday, January 1, 2025, 12:30:45 PM
 */
export function formatDateFull(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'PPPppp');
  } catch {
    return typeof dateString === 'string' ? dateString : dateString.toISOString();
  }
}

/**
 * Calculate the number of days between two dates
 */
export function daysBetween(fromDate: string | Date, toDate: string | Date): number {
  try {
    const from = typeof fromDate === 'string' ? parseISO(fromDate) : fromDate;
    const to = typeof toDate === 'string' ? parseISO(toDate) : toDate;
    const milliseconds = to.getTime() - from.getTime();
    return Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Calculate the number of hours between two dates
 */
export function hoursBetween(fromDate: string | Date, toDate: string | Date): number {
  try {
    const from = typeof fromDate === 'string' ? parseISO(fromDate) : fromDate;
    const to = typeof toDate === 'string' ? parseISO(toDate) : toDate;
    const milliseconds = to.getTime() - from.getTime();
    return Math.floor(milliseconds / (1000 * 60 * 60));
  } catch {
    return 0;
  }
}

/**
 * Check if a date is after another date
 */
export function isAfter(date: string | Date, compareDate: string | Date): boolean {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    const cd = typeof compareDate === 'string' ? parseISO(compareDate) : compareDate;
    return d.getTime() > cd.getTime();
  } catch {
    return false;
  }
}

/**
 * Check if a date is before another date
 */
export function isBefore(date: string | Date, compareDate: string | Date): boolean {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    const cd = typeof compareDate === 'string' ? parseISO(compareDate) : compareDate;
    return d.getTime() < cd.getTime();
  } catch {
    return false;
  }
}
