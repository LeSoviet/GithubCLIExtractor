import { logger } from '../utils/logger.js';

export interface AdaptiveRetryOptions {
  datasetSize: number; // Total number of items to fetch
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void;
  onProgress?: (itemsProcessed: number, totalItems: number) => void;
}

export interface AdaptiveRetryResult<T> {
  success: boolean;
  data?: T[];
  itemsProcessed: number;
  totalAttempts: number;
  errors: Error[];
  duration: number;
}

/**
 * Adaptive Retry Strategy for Large Repository Exports
 *
 * Handles datasets > 2000 items with intelligent retry logic:
 * - Increases retry attempts for larger datasets
 * - Uses adaptive backoff based on dataset size
 * - Supports partial success recovery
 * - Provides detailed progress tracking
 */
export class AdaptiveRetry {
  private readonly datasetSize: number;
  private readonly maxRetries: number;
  private readonly initialDelay: number;
  private readonly maxDelay: number;
  private readonly backoffMultiplier: number;
  private readonly onRetry?: (attempt: number, error: Error, nextDelay: number) => void;
  private readonly onProgress?: (itemsProcessed: number, totalItems: number) => void;

  constructor(options: AdaptiveRetryOptions) {
    this.datasetSize = options.datasetSize;

    // Scale retries based on dataset size
    // Small datasets (<1000): 3 retries
    // Medium (1000-5000): 5 retries
    // Large (5000-10000): 7 retries
    // Very large (>10000): 10 retries
    this.maxRetries = options.maxRetries || this.calculateMaxRetries(options.datasetSize);

    // Scale delays based on dataset size
    this.initialDelay = options.initialDelay || Math.min(1000, 500 + this.datasetSize / 10);
    this.maxDelay = options.maxDelay || Math.min(60000, 30000 + this.datasetSize / 5);
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.onRetry = options.onRetry;
    this.onProgress = options.onProgress;

    logger.debug(
      `AdaptiveRetry initialized for ${options.datasetSize} items: maxRetries=${this.maxRetries}, initialDelay=${this.initialDelay}ms`
    );
  }

  /**
   * Calculate optimal retry count based on dataset size
   */
  private calculateMaxRetries(datasetSize: number): number {
    if (datasetSize < 1000) return 3;
    if (datasetSize < 5000) return 5;
    if (datasetSize < 10000) return 7;
    return 10;
  }

  /**
   * Execute a function with adaptive retry strategy
   * Returns partial results even if some items fail
   */
  async executeWithPartialRecovery<T>(
    fn: (tracker: { processed: number; addProgress: (count: number) => void }) => Promise<T[]>,
    shouldRetry: (error: Error) => boolean = () => true
  ): Promise<AdaptiveRetryResult<T>> {
    const startTime = Date.now();
    const errors: Error[] = [];
    let processedItems = 0;
    const lastData: T[] = [];

    const tracker = {
      processed: 0,
      addProgress: (count: number) => {
        tracker.processed += count;
        processedItems += count;
        if (this.onProgress) {
          this.onProgress(processedItems, this.datasetSize);
        }
      },
    };

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const data = await fn(tracker);
        return {
          success: true,
          data,
          itemsProcessed: processedItems,
          totalAttempts: attempt + 1,
          errors,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(err);

        if (attempt < this.maxRetries && shouldRetry(err)) {
          const delay = this.calculateDelay(attempt);

          logger.warn(
            `Attempt ${attempt + 1}/${this.maxRetries} failed for dataset of ${this.datasetSize} items: ${err.message}`
          );
          logger.info(
            `Retrying in ${delay}ms... (processed: ${processedItems}/${this.datasetSize})`
          );

          if (this.onRetry) {
            this.onRetry(attempt + 1, err, delay);
          }

          await this.sleep(delay);
        } else {
          // Return partial success if we've processed some items
          if (processedItems > 0) {
            logger.warn(
              `Exhausted retries but recovered ${processedItems}/${this.datasetSize} items`
            );
            return {
              success: false,
              data: lastData,
              itemsProcessed: processedItems,
              totalAttempts: attempt + 1,
              errors,
              duration: Date.now() - startTime,
            };
          }

          throw err;
        }
      }
    }

    throw new Error(
      `Failed after ${this.maxRetries} retries: ${errors[errors.length - 1]?.message}`
    );
  }

  /**
   * Execute with chunked processing for large datasets
   * Processes data in batches to prevent memory overload
   */
  async executeWithChunking<T>(
    fn: (offset: number, limit: number) => Promise<T[]>,
    chunkSize: number = 500,
    shouldRetry: (error: Error) => boolean = () => true
  ): Promise<AdaptiveRetryResult<T>> {
    const startTime = Date.now();
    const allData: T[] = [];
    const errors: Error[] = [];
    const numChunks = Math.ceil(this.datasetSize / chunkSize);

    logger.info(`Processing ${this.datasetSize} items in ${numChunks} chunks of ${chunkSize}`);

    for (let chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
      const offset = chunkIndex * chunkSize;
      const limit = Math.min(chunkSize, this.datasetSize - offset);

      let chunkSuccess = false;
      let chunkAttempts = 0;

      for (let attempt = 0; attempt <= this.maxRetries && !chunkSuccess; attempt++) {
        try {
          chunkAttempts++;
          const chunkData = await fn(offset, limit);
          allData.push(...chunkData);

          if (this.onProgress) {
            this.onProgress(allData.length, this.datasetSize);
          }

          chunkSuccess = true;
          logger.debug(`Chunk ${chunkIndex + 1}/${numChunks} completed`);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));

          if (attempt < this.maxRetries && shouldRetry(err)) {
            const delay = this.calculateDelay(attempt);
            logger.warn(
              `Chunk ${chunkIndex + 1}/${numChunks} failed (attempt ${attempt + 1}/${this.maxRetries}): ${err.message}`
            );
            logger.info(`Retrying in ${delay}ms...`);
            await this.sleep(delay);
          } else {
            errors.push(err);
            logger.error(
              `Chunk ${chunkIndex + 1}/${numChunks} failed after ${chunkAttempts} attempts`
            );
            // Continue to next chunk instead of failing completely
            break;
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      data: allData,
      itemsProcessed: allData.length,
      totalAttempts: Math.ceil(this.datasetSize / chunkSize),
      errors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Calculate adaptive delay based on attempt number and dataset size
   */
  private calculateDelay(attempt: number): number {
    // Scale multiplier based on dataset size
    let multiplier = this.backoffMultiplier;
    if (this.datasetSize > 5000) {
      multiplier = Math.min(3, this.backoffMultiplier + 0.5);
    }

    const delay = Math.min(this.initialDelay * Math.pow(multiplier, attempt), this.maxDelay);

    return Math.round(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get retry strategy info
   */
  getStrategyInfo(): {
    datasetSize: number;
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    estimatedMaxDuration: number;
  } {
    // Estimate maximum total duration (worst case: all retries fail and we retry)
    let maxDuration = 0;
    for (let i = 0; i < this.maxRetries; i++) {
      maxDuration += this.calculateDelay(i);
    }

    return {
      datasetSize: this.datasetSize,
      maxRetries: this.maxRetries,
      initialDelay: this.initialDelay,
      maxDelay: this.maxDelay,
      estimatedMaxDuration: maxDuration,
    };
  }
}
