/**
 * Sanitize a filename by removing or replacing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  return (
    filename
      // eslint-disable-next-line no-control-regex
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-') // Replace invalid characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 255)
  ); // Limit length
}

/**
 * Decode unicode escape sequences safely
 */
export function decodeUnicode(str: string): string {
  if (!str) return '';
  try {
    // First handle escaped Unicode like \u0041
    let result = str.replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
      return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
    });

    // Then sanitize problematic Unicode characters that cause PDF encoding issues
    result = sanitizeUnicode(result);

    return result;
  } catch {
    return str;
  }
}

/**
 * Sanitize Unicode characters that cause PDF encoding issues
 * Preserves UTF-8 encoding for international characters while handling PDF-problematic chars
 */
export function sanitizeUnicode(text: string): string {
  if (!text) return '';

  // Map of problematic characters that cause PDF rendering issues
  // Keep this minimal - only characters that actually break PDF encoding
  const replacements: { [key: string]: string } = {
    // PDF-problematic arrows (use ASCII alternatives)
    '→': '->',
    '←': '<-',
    '↑': '^',
    '↓': 'v',
    '⇒': '=>',
    '⇐': '<=',
    // Bullets that may cause issues
    '•': '-',
    '○': 'o',
    '●': '*',
  };

  let result = text;
  for (const [unicode, ascii] of Object.entries(replacements)) {
    result = result.split(unicode).join(ascii);
  }

  // Only remove control characters, preserve UTF-8 printable characters
  // This allows international characters (é, ñ, 中文, etc.) while removing problematic control chars
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[\x00-\x1F\x7F]/g, '');

  return result;
}

/**
 * Escape markdown special characters
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1');
}

/**
 * Truncate text to a specific length
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Convert text to kebab-case for filenames
 */
export function toKebabCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
