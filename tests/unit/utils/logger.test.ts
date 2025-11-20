import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, LogLevel } from '@/utils/logger';

describe('logger', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Set to DEBUG level to capture all messages
    logger.setLevel(LogLevel.DEBUG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    logger.setLevel(LogLevel.INFO); // Reset to default
  });

  it('should log error messages', () => {
    logger.error('Test error message');
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0][0]).toContain('Test error message');
  });

  it('should log warning messages', () => {
    logger.warn('Test warning message');
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleWarnSpy.mock.calls[0][0]).toContain('Test warning message');
  });

  it('should log info messages', () => {
    logger.info('Test info message');
    expect(consoleLogSpy).toHaveBeenCalled();
    expect(consoleLogSpy.mock.calls[0][0]).toContain('Test info message');
  });

  it('should log debug messages', () => {
    logger.debug('Test debug message');
    expect(consoleLogSpy).toHaveBeenCalled();
    expect(consoleLogSpy.mock.calls[0][0]).toContain('Test debug message');
  });

  it('should format messages with prefix', () => {
    logger.info('Test message');
    expect(consoleLogSpy).toHaveBeenCalled();
    const loggedMessage = consoleLogSpy.mock.calls[0][0] as string;
    expect(loggedMessage).toMatch(/\[INFO\]/);
    expect(loggedMessage).toContain('Test message');
  });
});
