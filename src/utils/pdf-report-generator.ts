import type { AnalyticsReport } from '../types/analytics.js';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { writeFile } from 'fs/promises';

/**
 * Professional PDF report generator with charts and analytics visualization
 */
export class PdfReportGenerator {
  private pdfDoc: PDFDocument | null = null;
  private currentY: number = 0;
  private pageHeight: number = 792;
  private pageWidth: number = 612;
  private margin: number = 40;
  private lineHeight: number = 18;
  private regularFont: PDFFont | null = null;
  private boldFont: PDFFont | null = null;

  async generateAnalyticsReport(report: AnalyticsReport, outputPath: string): Promise<void> {
    try {
      this.pdfDoc = await PDFDocument.create();

      // Embed fonts
      this.regularFont = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
      this.boldFont = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Verify fonts are loaded
      if (!this.regularFont || !this.boldFont) {
        throw new Error('Failed to embed fonts. Font objects are null.');
      }

      this.currentY = this.pageHeight - this.margin;

      const page = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);

      // Add title page
      this.drawText(page, report.repository, 28, { bold: true });
      this.drawText(page, 'Analytics Report', 20, { bold: true });
      this.drawText(page, `Generated: ${new Date(report.generatedAt).toLocaleDateString()}`, 12);

      // Add sections
      this.currentY -= 40;
      this.drawDivider(page);

      // Activity Analytics Section
      this.currentY -= 30;
      this.drawText(page, '[Activity Analytics]', 16, { bold: true });
      this.drawActivityMetrics(page, report);

      this.currentY -= 30;
      this.drawDivider(page);

      // Contributors Section
      this.currentY -= 30;
      this.drawText(page, '[Contributors]', 16, { bold: true });
      this.drawContributorMetrics(page, report);

      this.currentY -= 30;
      this.drawDivider(page);

      // Labels/Topics Section
      this.currentY -= 30;
      this.drawText(page, '[Labels & Topics]', 16, { bold: true });
      this.drawLabelMetrics(page, report);

      this.currentY -= 30;
      this.drawDivider(page);

      // Health Indicators Section
      this.currentY -= 30;
      this.drawText(page, '[Repository Health]', 16, { bold: true });
      this.drawHealthMetrics(page, report);

      // Save PDF
      const pdfBytes = await this.pdfDoc.save();
      await writeFile(outputPath, pdfBytes);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate analytics PDF: ${errorMsg}`);
    }
  }

  private drawActivityMetrics(page: PDFPage, report: AnalyticsReport): void {
    const activity = report.activity;

    // PR Merge Rate with visual indicator
    const mergeRate = activity.prMergeRate.mergeRate.toFixed(1);
    this.drawText(page, `Pull Request Merge Rate: ${mergeRate}%`, 12);
    this.drawProgressBar(page, activity.prMergeRate.mergeRate);

    this.currentY -= this.lineHeight;
    this.drawText(
      page,
      `  • Merged: ${activity.prMergeRate.merged} | Closed: ${activity.prMergeRate.closed}`,
      11
    );

    // Issue Resolution Time
    this.currentY -= this.lineHeight * 1.5;
    this.drawText(page, `Issue Resolution Time`, 12, { bold: true });
    this.drawText(
      page,
      `  • Average: ${activity.issueResolutionTime.averageHours.toFixed(1)} hours`,
      11
    );
    this.drawText(
      page,
      `  • Median: ${activity.issueResolutionTime.medianHours.toFixed(1)} hours`,
      11
    );

    // Top Contributors
    if (activity.activeContributors.length > 0) {
      this.currentY -= this.lineHeight * 1.5;
      this.drawText(page, `Top Contributors`, 12, { bold: true });
      const topContributors = activity.activeContributors.slice(0, 5);
      topContributors.forEach((contributor: any, index: number) => {
        this.drawText(
          page,
          `  ${index + 1}. ${contributor.login || contributor}: ${contributor.count || contributor} contributions`,
          11
        );
      });
    }
  }

  private drawContributorMetrics(page: PDFPage, report: AnalyticsReport): void {
    const contributors = report.contributors;

    this.drawText(page, `Total Contributors: ${contributors.topContributors.length}`, 12);

    this.currentY -= this.lineHeight;
    this.drawText(page, 'Top 5 Contributors by Commits:', 11, { bold: true });

    contributors.topContributors.slice(0, 5).forEach((contributor: any, index: number) => {
      this.drawText(page, `  ${index + 1}. ${contributor.login}`, 11);
      this.drawText(
        page,
        `      Commits: ${contributor.commits} | PRs: ${contributor.prs} | Reviews: ${contributor.reviews}`,
        10
      );
    });

    // New vs Returning
    this.currentY -= this.lineHeight * 1.5;
    this.drawText(page, `New Contributors: ${contributors.newVsReturning.new}`, 11);
    this.drawText(page, `Returning Contributors: ${contributors.newVsReturning.returning}`, 11);

    // Bus Factor
    this.currentY -= this.lineHeight;
    this.drawText(page, `Bus Factor: ${contributors.busFactor} contributors`, 11);
  }

  private drawLabelMetrics(page: PDFPage, report: AnalyticsReport): void {
    const labels = report.labels;

    this.drawText(page, `Total Labels: ${labels.labelDistribution.length}`, 12);

    this.currentY -= this.lineHeight;
    this.drawText(page, 'Most Used Labels:', 11, { bold: true });

    labels.labelDistribution.slice(0, 5).forEach((label: any) => {
      this.drawText(
        page,
        `  • ${label.label}: ${label.count} issues (${label.percentage.toFixed(1)}%)`,
        11
      );
    });

    // Issue Lifecycle
    this.currentY -= this.lineHeight * 1.5;
    this.drawText(page, `Issue Lifecycle`, 11, { bold: true });
    this.drawText(
      page,
      `  • Average Open Days: ${labels.issueLifecycle.averageOpenDays.toFixed(1)}`,
      11
    );
    this.drawText(
      page,
      `  • Median Open Days: ${labels.issueLifecycle.medianOpenDays.toFixed(1)}`,
      11
    );

    // Issue vs PR Ratio
    this.currentY -= this.lineHeight;
    this.drawText(page, `Issue to PR Ratio: ${labels.issueVsPrratio.toFixed(2)}:1`, 11);
  }

  private drawHealthMetrics(page: PDFPage, report: AnalyticsReport): void {
    const health = report.health;

    // PR Review Coverage
    const coveragePercent = health.prReviewCoverage.coveragePercentage;
    this.drawText(page, `PR Review Coverage: ${coveragePercent.toFixed(1)}%`, 12);
    this.drawProgressBar(page, coveragePercent);
    this.currentY -= this.lineHeight;

    // Average PR Size
    this.drawText(page, `Average PR Size`, 11, { bold: true });
    this.drawText(
      page,
      `  • Additions: ${health.averagePrSize.additions} | Deletions: ${health.averagePrSize.deletions}`,
      11
    );

    // Time to First Review
    this.currentY -= this.lineHeight * 1.5;
    this.drawText(page, `Time to First Review`, 11, { bold: true });
    this.drawText(
      page,
      `  • Average: ${health.timeToFirstReview.averageHours.toFixed(1)} hours`,
      11
    );
    this.drawText(page, `  • Median: ${health.timeToFirstReview.medianHours.toFixed(1)} hours`, 11);

    // Deployment Frequency
    this.currentY -= this.lineHeight * 1.5;
    this.drawText(
      page,
      `Deployment Frequency: ${health.deploymentFrequency.releases} releases (${health.deploymentFrequency.period})`,
      11
    );
  }

  private drawProgressBar(page: PDFPage, percentage: number): void {
    // Check if we need a new page before drawing
    if (this.currentY < this.margin + 20) {
      // New page
      const newPage = this.pdfDoc!.addPage([this.pageWidth, this.pageHeight]);
      this.currentY = this.pageHeight - this.margin;
      return this.drawProgressBar(newPage, percentage);
    }

    const barWidth = 200;
    const barHeight = 10;
    const barX = this.margin + 120;
    const barY = this.currentY - this.lineHeight;

    // Draw border
    page.drawRectangle({
      x: barX,
      y: barY - barHeight,
      width: barWidth,
      height: barHeight,
      borderColor: rgb(0, 0, 0), // Black border
      borderWidth: 1,
      color: rgb(240 / 255, 240 / 255, 240 / 255), // Light gray background
    });

    // Draw fill
    const fillWidth = (barWidth * Math.min(percentage, 100)) / 100;
    // pdf-lib requires RGB values 0-1, not 0-255
    const fillColor =
      percentage >= 70
        ? rgb(76 / 255, 175 / 255, 80 / 255) // Green
        : percentage >= 40
          ? rgb(255 / 255, 193 / 255, 7 / 255) // Yellow
          : rgb(244 / 255, 67 / 255, 54 / 255); // Red

    page.drawRectangle({
      x: barX,
      y: barY - barHeight,
      width: fillWidth,
      height: barHeight,
      color: fillColor,
    });

    // Draw percentage text
    if (this.regularFont) {
      page.drawText(`${percentage.toFixed(1)}%`, {
        x: barX + barWidth + 10,
        y: barY - barHeight + 2,
        size: 10,
        font: this.regularFont,
      });
    }

    this.currentY -= this.lineHeight * 2; // Add extra spacing after progress bar
  }

  private drawText(
    page: PDFPage,
    text: string,
    fontSize: number = 12,
    options: { bold?: boolean; italic?: boolean } = {}
  ): void {
    const font: PDFFont | null = options.bold ? this.boldFont : this.regularFont;

    if (!font || typeof font !== 'object' || !('heightAtSize' in font)) {
      throw new Error(
        `Font not properly initialized. Expected PDFFont object, got: ${typeof font}. ` +
          `bold=${options.bold}, regularFont=${typeof this.regularFont}, boldFont=${typeof this.boldFont}`
      );
    }

    // Wrap text if too long
    const maxWidth = this.pageWidth - 2 * this.margin;
    const words = text.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = this.estimateTextWidth(testLine, fontSize);

      if (width > maxWidth && currentLine) {
        this.drawSingleLine(page, currentLine, fontSize, font);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      this.drawSingleLine(page, currentLine, fontSize, font);
    }
  }

  private drawSingleLine(page: PDFPage, text: string, fontSize: number, font: PDFFont): void {
    // Check if we have enough space for this line (with some buffer)
    if (this.currentY < this.margin + this.lineHeight) {
      // New page
      page = this.pdfDoc!.addPage([this.pageWidth, this.pageHeight]);
      this.currentY = this.pageHeight - this.margin;
    }

    page.drawText(text, {
      x: this.margin,
      y: this.currentY,
      size: fontSize,
      font: font, // PDFFont object, not string
      color: rgb(0, 0, 0),
    });

    this.currentY -= this.lineHeight;
  }

  private drawDivider(page: PDFPage): void {
    if (this.currentY < this.margin + this.lineHeight) {
      // New page if needed
      page = this.pdfDoc!.addPage([this.pageWidth, this.pageHeight]);
      this.currentY = this.pageHeight - this.margin;
      return;
    }

    page.drawLine({
      start: { x: this.margin, y: this.currentY },
      end: { x: this.pageWidth - this.margin, y: this.currentY },
      thickness: 1,
      color: rgb(200 / 255, 200 / 255, 200 / 255), // Light gray line
    });

    this.currentY -= this.lineHeight;
  }

  private estimateTextWidth(text: string, fontSize: number): number {
    // Rough estimation: average character width is about 0.5 of fontSize
    return text.length * (fontSize * 0.5);
  }
}

export async function generateAnalyticsReportPdf(
  report: AnalyticsReport,
  outputPath: string
): Promise<void> {
  const generator = new PdfReportGenerator();
  await generator.generateAnalyticsReport(report, outputPath);
}
