import chalk from 'chalk';

// Exported constants for testing and external use
export const LOG_PREFIXES = {
  INFO: chalk.blue('ℹ'),
  SUCCESS: chalk.green('✓'),
  WARNING: chalk.yellow('⚠'),
  ERROR: chalk.red('✗'),
  DEBUG: chalk.gray('🐛'),
  PROGRESS: chalk.cyan('Progress:'),
} as const;

export class Logger {
  static info(message: string, ...args: any[]): void {
    console.log(LOG_PREFIXES.INFO, message, ...args);
  }

  static success(message: string, ...args: any[]): void {
    console.log(LOG_PREFIXES.SUCCESS, message, ...args);
  }

  static warning(message: string, ...args: any[]): void {
    console.log(LOG_PREFIXES.WARNING, message, ...args);
  }

  static error(message: string, ...args: any[]): void {
    console.error(LOG_PREFIXES.ERROR, message, ...args);
  }

  static debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.log(LOG_PREFIXES.DEBUG, message, ...args);
    }
  }

  static progress(message: string, current: number, total: number): void {
    const percentage = Math.round((current / total) * 100);
    const bar =
      '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
    process.stdout.write(
      `\r${LOG_PREFIXES.PROGRESS} [${bar}] ${percentage}% (${current}/${total}) ${message}`
    );
    if (current === total) {
      process.stdout.write('\n');
    }
  }

  static row(values: string[]): void {
    // Sanitize each value by replacing tabs, newlines, and carriage returns with spaces
    const sanitizedValues = values.map(value =>
      value.replace(/\t/g, ' ').replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ')
    );
    // Output values separated by tab character
    console.log(sanitizedValues.join('\t'));
  }
}
