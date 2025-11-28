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
 * Replaces problematic emoji and Unicode with ASCII alternatives
 */
export function sanitizeUnicode(text: string): string {
  if (!text) return '';

  // Map of problematic Unicode characters to safe ASCII replacements
  const replacements: { [key: string]: string } = {
    // Emojis commonly causing WinAnsi errors
    '🔀': '[Merged]',
    '📄': '[Document]',
    '✅': '[Done]',
    '❌': '[Failed]',
    '⏱️': '[Time]',
    '🔓': '[Open]',
    '📌': '[Pin]',
    '💬': '[Comment]',
    '👤': '[User]',
    '📊': '[Chart]',
    '👥': '[Users]',
    '🏷️': '[Label]',
    '❤️': '[Health]',
    '🎯': '[Goal]',
    '🐛': '[Bug]',
    '✨': '[Feature]',
    '🚀': '[Release]',
    '💡': '[Idea]',
    // Arrows
    '→': '->',
    '←': '<-',
    '↑': '^^',
    '↓': 'vv',
    '⇒': '=>',
    '⇐': '<=',
    // Bullets and symbols
    '•': '-',
    '○': 'o',
    '●': '*',
    '■': '[Box]',
    '□': '[Empty]',
    // Math and other
    '±': '+/-',
    '÷': '/',
    '×': 'x',
    '∞': '[Infinity]',
    '√': '[Root]',
  };

  let result = text;
  for (const [unicode, ascii] of Object.entries(replacements)) {
    result = result.split(unicode).join(ascii);
  }

  // Remove any remaining characters that are not ASCII printable
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[^\x20-\x7E\n\r\t]/g, '?');

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
