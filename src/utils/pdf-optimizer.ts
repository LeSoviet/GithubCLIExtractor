import { logger } from './logger.js';

/**
 * PDF Optimization options
 */
export interface PDFOptimizationOptions {
  compressionLevel?: 'low' | 'medium' | 'high';
  removeMetadata?: boolean;
  removeAnnotations?: boolean;
  deduplicate?: boolean;
  maxPageSize?: number; // in KB
  chunkSize?: number; // items per PDF
  memoryLimit?: number; // in MB
}

/**
 * PDF Optimization Result
 */
export interface OptimizationResult {
  success: boolean;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  chunksRequired: number;
  estimatedMemory: number;
  warnings: string[];
}

/**
 * PDF Optimizer for improved performance and memory efficiency
 * Handles large exports by chunking and compression
 */
export class PDFOptimizer {
  private readonly compressionLevel: 'low' | 'medium' | 'high';
  private readonly removeMetadata: boolean;
  private readonly removeAnnotations: boolean;
  private readonly deduplicate: boolean;
  private readonly chunkSize: number;
  private readonly memoryLimit: number;

  constructor(options: PDFOptimizationOptions = {}) {
    this.compressionLevel = options.compressionLevel || 'medium';
    this.removeMetadata = options.removeMetadata !== false;
    this.removeAnnotations = options.removeAnnotations !== false;
    this.deduplicate = options.deduplicate !== false;
    this.chunkSize = options.chunkSize || 100; // 100 items per chunk
    this.memoryLimit = options.memoryLimit || 512; // 512 MB

    logger.debug(
      `PDFOptimizer initialized: compression=${this.compressionLevel}, chunkSize=${this.chunkSize}`
    );
  }

  /**
   * Calculate optimal chunk size based on data size
   */
  calculateOptimalChunkSize(totalItems: number, avgItemSize: number): number {
    const estimatedTotalSize = totalItems * avgItemSize;
    const memoryInBytes = this.memoryLimit * 1024 * 1024;

    // Leave 30% margin for overhead
    const availableMemory = memoryInBytes * 0.7;

    // Calculate items that fit in available memory
    const itemsPerChunk = Math.max(
      10, // minimum
      Math.floor(availableMemory / avgItemSize)
    );

    logger.info(
      `Calculated optimal chunk size: ${itemsPerChunk} items (${estimatedTotalSize} bytes total, ${this.memoryLimit}MB limit)`
    );

    return itemsPerChunk;
  }

  /**
   * Estimate file size for optimization planning
   */
  estimateFileSize(items: number, avgItemSize: number): OptimizationResult {
    const originalSize = items * avgItemSize;
    let compressedSize = this.applyCompressionRatio(originalSize);

    // Apply additional optimizations
    if (this.removeMetadata) {
      compressedSize *= 0.95;
    }
    if (this.removeAnnotations) {
      compressedSize *= 0.97;
    }
    if (this.deduplicate) {
      compressedSize *= 0.85; // estimate 15% deduplication savings
    }

    const chunksRequired = Math.ceil(items / this.chunkSize);
    const estimatedMemory = (originalSize / 1024 / 1024) * 1.2; // 20% overhead

    const warnings: string[] = [];
    if (estimatedMemory > this.memoryLimit) {
      warnings.push(
        `Estimated memory usage (${estimatedMemory.toFixed(1)}MB) exceeds limit (${this.memoryLimit}MB). Will use chunking.`
      );
    }

    return {
      success: true,
      originalSize,
      optimizedSize: Math.round(compressedSize),
      compressionRatio: Math.round((compressedSize / originalSize) * 100),
      chunksRequired,
      estimatedMemory: Math.round(estimatedMemory),
      warnings,
    };
  }

  /**
   * Apply compression ratio based on compression level
   */
  private applyCompressionRatio(size: number): number {
    const ratios = {
      low: 0.85,
      medium: 0.65,
      high: 0.45,
    };

    return size * ratios[this.compressionLevel];
  }

  /**
   * Get compression parameters for PDF generation
   */
  getCompressionParams(): {
    quality: number;
    compress: boolean;
    deflate: boolean;
    scale: number;
  } {
    const params = {
      low: { quality: 95, compress: false, deflate: false, scale: 1.0 },
      medium: { quality: 85, compress: true, deflate: true, scale: 0.9 },
      high: { quality: 75, compress: true, deflate: true, scale: 0.8 },
    };

    return params[this.compressionLevel];
  }

  /**
   * Check if chunking is recommended
   */
  recommendChunking(totalItems: number): boolean {
    // Recommend chunking for large datasets
    if (totalItems > this.chunkSize * 5) {
      logger.info(`Chunking recommended for ${totalItems} items (chunk size: ${this.chunkSize})`);
      return true;
    }
    return false;
  }

  /**
   * Calculate chunks needed for export
   */
  calculateChunks(totalItems: number): Array<{ start: number; end: number; chunk: number }> {
    const chunks: Array<{ start: number; end: number; chunk: number }> = [];

    for (let i = 0; i < totalItems; i += this.chunkSize) {
      const start = i;
      const end = Math.min(i + this.chunkSize, totalItems);
      const chunkIndex = Math.floor(i / this.chunkSize);

      chunks.push({
        start,
        end,
        chunk: chunkIndex + 1,
      });
    }

    logger.debug(`Calculated ${chunks.length} chunks for ${totalItems} items`);
    return chunks;
  }

  /**
   * Estimate PDF generation time
   */
  estimateGenerationTime(items: number): number {
    // Rough estimate: 50ms per item + 500ms base
    const baseTime = 500;
    const itemTime = items * 50;
    return baseTime + itemTime;
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(totalItems: number, avgItemSize: number): string[] {
    const recommendations: string[] = [];
    const totalSize = totalItems * avgItemSize;
    const totalMB = totalSize / 1024 / 1024;

    if (totalMB > this.memoryLimit) {
      recommendations.push(
        `Dataset size (${totalMB.toFixed(1)}MB) exceeds memory limit. Use chunking for better performance.`
      );
    }

    if (totalItems > 1000 && this.compressionLevel === 'low') {
      recommendations.push(
        'For large datasets, consider using "medium" or "high" compression level'
      );
    }

    if (this.chunkSize > 200) {
      recommendations.push(
        `Reduce chunk size (currently ${this.chunkSize}) for better memory efficiency`
      );
    }

    if (totalItems > 10000) {
      recommendations.push('For datasets > 10K items, consider splitting into multiple exports');
    }

    return recommendations;
  }

  /**
   * Validate optimization strategy
   */
  validateStrategy(
    totalItems: number,
    avgItemSize: number
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const estimatedSize = (totalItems * avgItemSize) / 1024 / 1024;

    if (estimatedSize > this.memoryLimit * 2) {
      errors.push(
        `Estimated size (${estimatedSize.toFixed(1)}MB) is too large. Reduce items or increase memory limit.`
      );
    }

    if (estimatedSize > this.memoryLimit) {
      warnings.push(
        `Estimated size (${estimatedSize.toFixed(1)}MB) exceeds memory limit (${this.memoryLimit}MB).`
      );
    }

    if (this.chunkSize < 10) {
      warnings.push(`Chunk size (${this.chunkSize}) is very small, may impact performance`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get optimization report
   */
  getReport(totalItems: number, avgItemSize: number): string {
    const estimation = this.estimateFileSize(totalItems, avgItemSize);
    const recommendations = this.getRecommendations(totalItems, avgItemSize);
    const validation = this.validateStrategy(totalItems, avgItemSize);

    let report = '# PDF Optimization Report\n\n';

    report += '## Estimation\n\n';
    report += `- **Original Size:** ${(estimation.originalSize / 1024).toFixed(1)} KB\n`;
    report += `- **Optimized Size:** ${(estimation.optimizedSize / 1024).toFixed(1)} KB\n`;
    report += `- **Compression Ratio:** ${estimation.compressionRatio}%\n`;
    report += `- **Chunks Required:** ${estimation.chunksRequired}\n`;
    report += `- **Estimated Memory:** ${estimation.estimatedMemory} MB\n\n`;

    if (estimation.warnings.length > 0) {
      report += '## Warnings\n\n';
      for (const warning of estimation.warnings) {
        report += `- ${warning}\n`;
      }
      report += '\n';
    }

    if (recommendations.length > 0) {
      report += '## Recommendations\n\n';
      for (const rec of recommendations) {
        report += `- ${rec}\n`;
      }
      report += '\n';
    }

    if (!validation.isValid) {
      report += '## Errors\n\n';
      for (const error of validation.errors) {
        report += `- **ERROR:** ${error}\n`;
      }
      report += '\n';
    }

    return report;
  }
}

/**
 * Factory function for creating optimizer with presets
 */
export function createPDFOptimizer(
  preset: 'performance' | 'quality' | 'balanced' = 'balanced',
  overrides?: PDFOptimizationOptions
): PDFOptimizer {
  const presets = {
    performance: {
      compressionLevel: 'high' as const,
      removeMetadata: true,
      removeAnnotations: true,
      deduplicate: true,
      maxPageSize: 300,
      chunkSize: 50,
      memoryLimit: 256,
    },
    quality: {
      compressionLevel: 'low' as const,
      removeMetadata: false,
      removeAnnotations: false,
      deduplicate: false,
      maxPageSize: 1000,
      chunkSize: 200,
      memoryLimit: 1024,
    },
    balanced: {
      compressionLevel: 'medium' as const,
      removeMetadata: true,
      removeAnnotations: true,
      deduplicate: true,
      maxPageSize: 500,
      chunkSize: 100,
      memoryLimit: 512,
    },
  };

  return new PDFOptimizer({
    ...presets[preset],
    ...overrides,
  });
}
