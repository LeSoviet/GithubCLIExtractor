export interface ExportFilters {
  // Date filters
  dateFrom?: Date | string;
  dateTo?: Date | string;

  // Author filter
  authors?: string[];

  // Label filters
  includeLabels?: string[];
  excludeLabels?: string[];

  // State filter
  states?: ('open' | 'closed' | 'merged')[];

  // Branch filter (for commits)
  branches?: string[];
  excludeBranches?: string[];

  // Limit
  limit?: number;
}

/**
 * Check if a date is within the filter range
 */
export function isDateInRange(
  date: string | Date,
  dateFrom?: Date | string,
  dateTo?: Date | string
): boolean {
  const itemDate = new Date(date);

  if (dateFrom) {
    const from = new Date(dateFrom);
    if (itemDate < from) return false;
  }

  if (dateTo) {
    const to = new Date(dateTo);
    if (itemDate > to) return false;
  }

  return true;
}

/**
 * Check if author matches filter
 */
export function isAuthorMatch(author: string, authors?: string[]): boolean {
  if (!authors || authors.length === 0) return true;
  return authors.includes(author);
}

/**
 * Check if labels match filter
 */
export function areLabelsMatch(
  itemLabels: string[],
  includeLabels?: string[],
  excludeLabels?: string[]
): boolean {
  // Check exclude labels first
  if (excludeLabels && excludeLabels.length > 0) {
    const hasExcluded = itemLabels.some((label) => excludeLabels.includes(label));
    if (hasExcluded) return false;
  }

  // Check include labels
  if (includeLabels && includeLabels.length > 0) {
    const hasIncluded = itemLabels.some((label) => includeLabels.includes(label));
    return hasIncluded;
  }

  return true;
}

/**
 * Check if state matches filter
 */
export function isStateMatch(
  state: 'open' | 'closed' | 'merged',
  states?: ('open' | 'closed' | 'merged')[]
): boolean {
  if (!states || states.length === 0) return true;
  return states.includes(state);
}
