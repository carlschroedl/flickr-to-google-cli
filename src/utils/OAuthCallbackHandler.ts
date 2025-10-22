import { spawn } from 'child_process';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { Logger } from './Logger';

export interface OAuthCallbackOptions {
  authorizationUrl: string;
  port: number;
  timeout?: number;
}

export interface OAuthCallbackResult {
  code: string;
}

export class OAuthCallbackHandler {
  private server: any = null;
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

      // Create HTTP server
      this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
        this.handleRequest(req, res);
      });

      // Start server
      this.server.listen(port, 'localhost', () => {
        Logger.info(`OAuth callback server started on port ${port}`);

        // Open browser to authorization URL
        this.openBrowser(authorizationUrl).catch(error => {
          Logger.warning(`Failed to open browser automatically: ${error.message}`);
          Logger.info(`Please open this URL in your browser: ${authorizationUrl}`);
        });
      });

      // Handle server errors
      this.server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          this.cleanup();
          reject(new Error(`Port ${port} is already in use. Please try again.`));
        } else {
          this.cleanup();
          reject(error);
        }
      });
    });
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url || '', `http://localhost:${this.server?.address()?.port || 3000}`);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description') || 'Unknown error';

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (error) {
      this.sendErrorPage(res, error, errorDescription || undefined);
      this.cleanup();
      this.rejectPromise?.(
        new Error(`OAuth error: ${error} - ${errorDescription || 'Unknown error'}`)
      );
      return;
    }

    if (code) {
      this.sendSuccessPage(res);
      this.cleanup();
      this.resolvePromise?.({ code });
    } else {
      this.sendErrorPage(res, 'missing_code', 'Authorization code not found in callback URL');
      this.cleanup();
      this.rejectPromise?.(new Error('Authorization code not found in callback URL'));
    }
  }

  private sendSuccessPage(res: ServerResponse): void {
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

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  private sendErrorPage(res: ServerResponse, error: string, description?: string): void {
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

    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  private cleanup(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.server) {
      this.server.close();
      this.server = null;
    }

    this.resolvePromise = null;
    this.rejectPromise = null;
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

      child.on('error', reject);
      child.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to open browser (exit code: ${code})`));
        }
      });

      // Unref to allow the process to exit even if this child is still running
      child.unref();
    });
  }
}

// Export a convenience function that matches the oauth-callback interface
export async function getAuthCode(options: OAuthCallbackOptions): Promise<OAuthCallbackResult> {
  const handler = new OAuthCallbackHandler();
  return handler.getAuthCode(options);
}
