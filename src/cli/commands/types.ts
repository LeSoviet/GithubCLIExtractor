/**
 * Types for CLI commands
 */

/**
 * Interface for command handlers
 */
export interface CommandHandler {
  execute(): Promise<void> | void;
}
