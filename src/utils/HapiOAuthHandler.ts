import { Server } from '@hapi/hapi';
import { spawn } from 'child_process';
import { Logger } from './Logger';

export interface OAuthCallbackOptions {
  authorizationUrl: string;
  port: number;
  timeout?: number;
}

export interface OAuthCallbackResult {
  code: string;
}

export class HapiOAuthHandler {
  private server: Server | null = null;
  private resolvePromise: ((result: OAuthCallbackResult) => void) | null = null;
  private rejectPromise: ((error: Error) => void) | null = null;
  private timeoutId: NodeJS.Timeout | null = null;

  async getAuthCode(options: OAuthCallbackOptions): Promise<OAuthCallbackResult> {
    const { authorizationUrl, port, timeout = 300000 } = options;

    return new Promise<OAuthCallbackResult>((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;

      // Set up timeout
      this.timeoutId = setTimeout(() => {
        this.cleanup();
        reject(new Error('OAuth authentication timed out. Please try again.'));
      }, timeout);

      this.createServer(port)
        .then(() => this.openBrowser(authorizationUrl))
        .catch(error => {
          this.cleanup();
          reject(error);
        });
    });
  }

  private async createServer(port: number): Promise<void> {
    try {
      this.server = new Server({
        port,
        host: 'localhost',
        routes: {
          cors: {
            origin: ['*'],
            credentials: true,
          },
        },
      });

      // Register the OAuth callback route
      this.server.route({
        method: 'GET',
        path: '/oauth2callback',
        handler: (request, h) => {
          const { code, error, error_description } = request.query;

          if (error) {
            this.sendErrorPage(h, error, error_description);
            this.cleanup();
            this.rejectPromise?.(
              new Error(`OAuth error: ${error} - ${error_description || 'Unknown error'}`)
            );
            return h.response().code(400);
          }

          if (code) {
            this.sendSuccessPage(h);
            this.cleanup();
            this.resolvePromise?.({ code });
            return h.response().code(200);
          }

          this.sendErrorPage(h, 'missing_code', 'Authorization code not found in callback URL');
          this.cleanup();
          this.rejectPromise?.(new Error('Authorization code not found in callback URL'));
          return h.response().code(400);
        },
      });

      await this.server.start();
      Logger.info(`OAuth callback server started on port ${port}`);
    } catch (error: any) {
      if (error.code === 'EADDRINUSE') {
        throw new Error(`Port ${port} is already in use. Please try again.`);
      }
      throw error;
    }
  }

  private sendSuccessPage(h: any): void {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: #f0f8ff;
            }
            .success {
              color: #28a745;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .message {
              color: #333;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="success">✅ Authentication Successful!</div>
          <div class="message">You can now close this window and return to the terminal.</div>
        </body>
      </html>
    `;

    h.response(html).type('text/html');
  }

  private sendErrorPage(h: any, error: string, description?: string): void {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Failed</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: #fff5f5;
            }
            .error {
              color: #dc3545;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .message {
              color: #333;
              font-size: 16px;
            }
            .details {
              color: #666;
              font-size: 14px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="error">❌ Authentication Failed</div>
          <div class="message">There was an error during authentication.</div>
          <div class="details">Error: ${error}${description ? `<br>Description: ${description}` : ''}</div>
        </body>
      </html>
    `;

    h.response(html).type('text/html');
  }

  private async openBrowser(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const platform = process.platform;
      let command: string;
      let args: string[];

      switch (platform) {
        case 'win32':
          command = 'cmd';
          args = ['/c', 'start', '', url];
          break;
        case 'darwin':
          command = 'open';
          args = [url];
          break;
        default: // linux and others
          command = 'xdg-open';
          args = [url];
          break;
      }

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

  private cleanup(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.server) {
      this.server.stop();
      this.server = null;
    }

    this.resolvePromise = null;
    this.rejectPromise = null;
  }
}

// Export a convenience function that matches the oauth-callback interface
export async function getAuthCode(options: OAuthCallbackOptions): Promise<OAuthCallbackResult> {
  const handler = new HapiOAuthHandler();
  return handler.getAuthCode(options);
}
