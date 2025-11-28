import puppeteer from 'puppeteer';
import { logger } from './logger.js';
import { ensureDirectory } from './output.js';
import { dirname } from 'path';

/**
 * Converts HTML content to PDF using Puppeteer
 * Provides professional-grade PDF generation with proper styling
 */
export class PuppeteerPdfConverter {
  /**
   * Convert HTML content to PDF file
   */
  async convertHtmlToPdf(htmlContent: string, outputPath: string): Promise<void> {
    let browser;
    try {
      logger.info(`Converting HTML to PDF: ${outputPath}`);

      // Ensure output directory exists
      await ensureDirectory(dirname(outputPath));

      // Launch browser in headless mode
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Set content with HTML
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Generate PDF with proper settings
      await page.pdf({
        path: outputPath,
        format: 'A4',
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm',
        },
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="width: 100%; font-size: 10px; padding: 10px 20px;">
            <span style="float: left;">GitHub Analytics Report</span>
            <span style="float: right;"><span class="date"></span></span>
          </div>
        `,
        footerTemplate: `
          <div style="width: 100%; font-size: 10px; padding: 10px 20px; text-align: center;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
        printBackground: true,
      });

      logger.info(`PDF generated successfully: ${outputPath}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to convert HTML to PDF: ${errorMsg}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Convert markdown-generated HTML to PDF
   * This is the main entry point for the PDF conversion pipeline
   */
  async convertMarkdownHtmlToPdf(
    htmlContent: string,
    outputPath: string,
    title: string = 'Analytics Report'
  ): Promise<void> {
    logger.info(`Starting HTML to PDF conversion for: ${title}`);
    await this.convertHtmlToPdf(htmlContent, outputPath);
  }
}
