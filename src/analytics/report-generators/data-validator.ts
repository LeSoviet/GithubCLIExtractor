/**
 * Data validation utilities for safe report generation
 * Prevents NaN, Infinity, and other invalid values from appearing in reports
 */

import { formatPercentage, formatDecimal, formatHours } from '../../utils/format-helpers.js';

/**
 * Safe division with fallback
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  fallback: string = 'Insufficient data'
): string | number {
  if (denominator === 0 || isNaN(numerator) || isNaN(denominator)) {
    return fallback;
  }
  const result = numerator / denominator;
  return isFinite(result) ? result : fallback;
}

/**
 * Safe percentage calculation
 */
export function safePercentage(value: number, total: number): string {
  const result = safeDivide(value, total, undefined);
  if (result === undefined || !isFinite(result as number)) {
    return '0%';
  }
  return `${formatPercentage((result as number) * 100)}`;
}

/**
 * Safe multiplier formatting
 */
export function safeMultiplier(numerator: number, denominator: number): string {
  if (denominator === 0 || denominator <= 0 || isNaN(numerator) || isNaN(denominator)) {
    return 'Insufficient data';
  }
  const result = numerator / denominator;
  if (!isFinite(result) || result < 0) {
    return 'Insufficient data';
  }
  return `${formatDecimal(result)}x`;
}

/**
 * Safe percentage delta formatting
 */
export function safePercentageDelta(delta: number): string {
  if (!isFinite(delta) || isNaN(delta)) {
    return '0%';
  }
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatPercentage(delta)}`;
}

/**
 * Safe time delta formatting (hours)
 */
export function safeTimeDelta(delta: number): string {
  if (!isFinite(delta) || isNaN(delta)) {
    return '0h';
  }
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatHours(delta)}`;
}

/**
 * Check if data is sufficient for display
 */
export function hasValidData(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'number') {
    return isFinite(value) && !isNaN(value) && value !== 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0 && value.some((v) => hasValidData(v));
  }
  if (typeof value === 'object') {
    return Object.values(value).some((v) => hasValidData(v));
  }
  return true;
}

/**
 * Safe array max with fallback
 */
export function safeMax(arr: number[], fallback: number = 0): number {
  const validValues = arr.filter((v) => isFinite(v) && !isNaN(v));
  return validValues.length > 0 ? Math.max(...validValues) : fallback;
}

/**
 * Safe array min with fallback
 */
export function safeMin(arr: number[], fallback: number = 0): number {
  const validValues = arr.filter((v) => isFinite(v) && !isNaN(v));
  return validValues.length > 0 ? Math.min(...validValues) : fallback;
}

/**
 * Safe average calculation
 */
export function safeAverage(arr: number[]): number {
  const validValues = arr.filter((v) => isFinite(v) && !isNaN(v));
  if (validValues.length === 0) {
    return 0;
  }
  return validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
}
