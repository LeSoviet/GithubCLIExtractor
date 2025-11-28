import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel = LogLevel.INFO;

  setLevel(level: LogLevel) {
    this.level = level;
  }

  debug(message: string, ...args: unknown[]) {
    if (this.level <= LogLevel.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: unknown[]) {
    if (this.level <= LogLevel.INFO) {
      console.log(chalk.cyan(`[INFO] ${message}`), ...args);
    }
  }

  success(message: string, ...args: unknown[]) {
    if (this.level <= LogLevel.INFO) {
      console.log(chalk.green(`[OK] ${message}`), ...args);
    }
  }

  warn(message: string, ...args: unknown[]) {
    if (this.level <= LogLevel.WARN) {
      console.warn(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  }

  error(message: string, ...args: unknown[]) {
    if (this.level <= LogLevel.ERROR) {
      console.error(chalk.red(`[ERROR] ${message}`), ...args);
    }
  }
}

export const logger = new Logger();
