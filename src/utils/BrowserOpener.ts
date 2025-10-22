import { spawn } from 'child_process';
import { Logger } from './Logger';

export class BrowserOpener {
  /**
   * Opens a URL in the user's default browser
   * @param url The URL to open
   * @returns Promise that resolves when the browser opening process completes
   */
  static async openBrowser(url: string): Promise<void> {
    return new Promise(resolve => {
      const { command, args } = this.getCommandForPlatform(url);

      const child = spawn(command, args, {
        stdio: 'ignore',
        detached: true,
      });

      child.on('error', error => {
        Logger.warning(`Failed to open browser automatically: ${error.message}`);
        Logger.info(`Please open this URL in your browser: ${url}`);
        resolve(); // Don't reject, just log and continue
      });

      child.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          Logger.warning(`Browser process exited with code ${code}`);
          Logger.info(`Please open this URL in your browser: ${url}`);
          resolve(); // Don't reject, just log and continue
        }
      });

      // Unref to allow the process to exit even if this child is still running
      child.unref();
    });
  }

  /**
   * Gets the appropriate command and arguments for opening a URL on the current platform
   * @param url The URL to open
   * @returns Object with command and args for the current platform
   */
  static getCommandForPlatform(url: string): { command: string; args: string[] } {
    const platform = process.platform;

    switch (platform) {
      case 'win32':
        return {
          command: 'cmd',
          args: ['/c', 'start', '', url],
        };
      case 'darwin':
        return {
          command: 'open',
          args: [url],
        };
      default: // linux and others
        return {
          command: 'xdg-open',
          args: [url],
        };
    }
  }
}
