import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { ensureDirectory } from './output.js';

/**
 * Convert Markdown content to plain text (strip Markdown formatting)
 */
function markdownToPlainText(markdown: string): string {
  // Simple Markdown to plain text conversion
  let text = markdown;

  // Replace common Unicode characters with ASCII equivalents for PDF compatibility
  const unicodeReplacements: { [key: string]: string } = {
    // Emojis and symbols
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
    // Arrows
    '→': '->',
    '←': '<-',
    '↑': '^^',
    '↓': 'vv',
    '⇒': '=>',
    // Bullets
    '•': '-',
    '○': 'o',
    '●': '*',
  };

  for (const [unicode, ascii] of Object.entries(unicodeReplacements)) {
    text = text.split(unicode).join(ascii);
  }

  // Remove any remaining non-ASCII characters that might cause encoding issues
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[^\x00-\x7F]/g, '?');

  // Remove headers
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '$1\n');

  // Remove bold/italic
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');

  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '[CODE BLOCK]');
  text = text.replace(/`([^`]+)`/g, '$1');

  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[$1]');

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, '');

  // Clean up extra newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Create PDF from Markdown content
 */
export async function createPdfFromMarkdown(
  markdownContent: string,
  outputPath: string,
  title?: string
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const plainText = markdownToPlainText(markdownContent);
  const lines = plainText.split('\n');

  const fontSize = 11;
  const lineHeight = fontSize * 1.2;
  const margin = 50;
  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const maxWidth = pageWidth - 2 * margin;
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5)); // Approximate chars per line

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  // Add title if provided
  if (title) {
    page.drawText(title, {
      x: margin,
      y: yPosition,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;
  }

  // Process each line
  for (const line of lines) {
    if (!line.trim()) {
      yPosition -= lineHeight / 2;
      continue;
    }

    // Simple word wrap based on character limit
    const words = line.split(' ');
    let currentLine = '';
    const wrappedLines: string[] = [];

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length > charsPerLine && currentLine) {
        wrappedLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      wrappedLines.push(currentLine);
    }

    // Draw wrapped lines with error handling for encoding
    for (const wrappedLine of wrappedLines) {
      if (yPosition < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }

      try {
        page.drawText(wrappedLine, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      } catch (error: any) {
        // If there's an encoding error, try with ASCII-safe version
        // eslint-disable-next-line no-control-regex
        const safeText = wrappedLine.replace(/[^\x00-\x7F]/g, '?');
        page.drawText(safeText, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      }

      yPosition -= lineHeight;
    }
  }

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  await ensureDirectory(join(outputPath, '..'));
  await writeFile(outputPath, pdfBytes);
}

/**
 * Convert a Markdown file to PDF
 */
export async function convertMarkdownFileToPdf(
  markdownPath: string,
  pdfPath: string,
  title?: string
): Promise<void> {
  if (!existsSync(markdownPath)) {
    throw new Error(`Markdown file not found: ${markdownPath}`);
  }

  const markdownContent = await readFile(markdownPath, 'utf-8');
  await createPdfFromMarkdown(markdownContent, pdfPath, title);
}

/**
 * Export content as PDF
 */
export async function writePdf(filePath: string, content: string, title?: string): Promise<void> {
  await createPdfFromMarkdown(content, filePath, title);
}
