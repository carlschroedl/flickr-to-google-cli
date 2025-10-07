import chalk from 'chalk';

export class Logger {
  static info(message: string, ...args: any[]): void {
    console.log(chalk.blue('ℹ'), message, ...args);
  }

  static success(message: string, ...args: any[]): void {
    console.log(chalk.green('✓'), message, ...args);
  }

  static warning(message: string, ...args: any[]): void {
    console.log(chalk.yellow('⚠'), message, ...args);
  }

  static error(message: string, ...args: any[]): void {
    console.error(chalk.red('✗'), message, ...args);
  }

  static debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🐛'), message, ...args);
    }
  }

  static progress(message: string, current: number, total: number): void {
    const percentage = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
    process.stdout.write(`\r${chalk.cyan('Progress:')} [${bar}] ${percentage}% (${current}/${total}) ${message}`);
    if (current === total) {
      process.stdout.write('\n');
    }
  }
}
