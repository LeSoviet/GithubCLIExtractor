import { marked } from 'marked';
import { logger } from '../utils/logger.js';

/**
 * Converts Markdown to styled HTML for PDF generation
 * Provides professional styling with embedded CSS
 */
export class HtmlReportGenerator {
  /**
   * Convert markdown content to styled HTML
   */
  async generateHtml(markdownContent: string, title: string = 'Analytics Report'): Promise<string> {
    try {
      // Convert markdown to HTML
      const htmlContent = await marked(markdownContent);

      // Wrap with styling
      const styledHtml = this.wrapWithStyles(htmlContent, title);
      return styledHtml;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to generate HTML report: ${errorMsg}`);
      throw error;
    }
  }

  private wrapWithStyles(htmlContent: string, title: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 40px 20px;
    }

    @media (max-width: 768px) {
      body {
        padding: 20px 10px;
      }
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 60px 50px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-radius: 4px;
    }

    @media (max-width: 768px) {
      .container {
        padding: 30px 20px;
      }
    }

    h1 {
      font-size: 2.5em;
      margin-bottom: 0.3em;
      color: #1a1a1a;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 0.3em;
    }

    h2 {
      font-size: 1.8em;
      margin: 1em 0 0.5em 0;
      color: #0066cc;
      border-left: 4px solid #0066cc;
      padding-left: 1em;
    }

    h3 {
      font-size: 1.1em;
      margin: 0.6em 0 0.3em 0;
      color: #333;
    }

    h4 {
      font-size: 0.95em;
      margin: 0.5em 0 0.25em 0;
      color: #555;
    }

    p {
      margin-bottom: 1em;
      text-align: justify;
    }

    code {
      background: #f0f0f0;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #d63384;
    }

    pre {
      background: #f8f8f8;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 1em;
      margin: 1em 0;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      line-height: 1.4;
    }

    pre code {
      background: none;
      padding: 0;
      color: #333;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
      font-size: 0.95em;
    }

    th {
      background: #f0f0f0;
      padding: 0.8em;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #ddd;
      color: #333;
    }

    td {
      padding: 0.8em;
      border-bottom: 1px solid #ddd;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:nth-child(even) {
      background: #f9f9f9;
    }

    ul, ol {
      margin-left: 2em;
      margin-bottom: 1em;
    }

    li {
      margin-bottom: 0.3em;
    }

    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 1em;
      margin: 1em 0;
      color: #666;
      font-style: italic;
    }

    strong {
      font-weight: 600;
      color: #1a1a1a;
    }

    em {
      font-style: italic;
      color: #555;
    }

    hr {
      border: none;
      border-top: 2px solid #eee;
      margin: 2em 0;
    }

    /* Alert/highlight boxes */
    .alert {
      padding: 1em;
      margin: 1em 0;
      border-radius: 4px;
      border-left: 4px solid;
    }

    /* Emoji size reduction */
    em, strong em {
      font-size: 0.9em;
      line-height: 1;
    }

    /* Paragraph spacing in dense sections */
    h2 + p,
    h3 + p {
      margin-top: 0;
    }

    /* Section control for PDF page breaks */
    h2 {
      page-break-inside: avoid;
      margin-bottom: 0.3em;
    }

    h2 + * {
      page-break-before: avoid;
    }

    .section {
      page-break-inside: avoid;
    }

    /* Reduce excessive whitespace */
    h2 {
      margin-top: 1.2em;
    }

    h3 {
      margin-top: 0.8em;
      margin-bottom: 0.2em;
    }

    /* Compact content sections */
    ul, ol {
      margin-top: 0.3em;
      margin-bottom: 0.3em;
    }

    p {
      margin-bottom: 0.5em;
    }

    /* Print styles */
    @media print {
      body {
        background: white;
        padding: 0;
      }

      .container {
        max-width: 100%;
        box-shadow: none;
        padding: 0;
      }

      h1 {
        page-break-after: avoid;
      }

      h2, h3 {
        page-break-after: avoid;
      }

      table {
        page-break-inside: avoid;
      }
    }

    /* Page sizing for PDF */
    @page {
      size: A4;
      margin: 20mm;
    }
  </style>
</head>
<body>
  <div class="container">
    ${htmlContent}
  </div>
</body>
</html>
    `;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}
