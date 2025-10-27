import { BrowserOpener } from '../../../src/utils/BrowserOpener';
import { Logger } from '../../../src/utils/Logger';

// Mock the Logger
jest.mock('../../../src/utils/Logger', () => ({
  Logger: {
    info: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

describe('BrowserOpener', () => {
  // eslint-disable-next-line @typescript-eslint/line-length
  const complex_oauth_url =
    'https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fphotoslibrary%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fphotoslibrary.appendonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fphotoslibrary.readonly&prompt=consent&response_type=code&client_id=123456789.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foauth2callback';
  // eslint-disable-next-line @typescript-eslint/line-length
  const windows_escaped_complex_oauth_url =
    'https://accounts.google.com/o/oauth2/v2/auth?access_type=offline^&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fphotoslibrary%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fphotoslibrary.appendonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fphotoslibrary.readonly^&prompt=consent^&response_type=code^&client_id=123456789.apps.googleusercontent.com^&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foauth2callback';
  // eslint-disable-next-line @typescript-eslint/line-length
  const nix_escaped_complex_oauth_url =
    'https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fphotoslibrary%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fphotoslibrary.appendonly%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fphotoslibrary.readonly&prompt=consent&response_type=code&client_id=123456789.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foauth2callback';
  let mockSpawn: jest.MockedFunction<any>;
  let originalPlatform: string;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mocked spawn function
    const { spawn } = require('child_process');
    mockSpawn = spawn;

    // Store original platform
    originalPlatform = process.platform;
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  /**
   * Helper method to temporarily override process.platform for testing
   * Automatically restores the original value even if test throws an error
   */
  const withPlatform = (platform: string, testFn: () => void | Promise<void>) => {
    const originalPlatformValue = process.platform;

    try {
      Object.defineProperty(process, 'platform', { value: platform });
      return testFn();
    } finally {
      // Always restore original platform, even if test throws
      Object.defineProperty(process, 'platform', { value: originalPlatformValue });
    }
  };

  describe('openBrowser', () => {
    it('should open browser on Windows', async () => {
      await withPlatform('win32', async () => {
        const mockChildProcess = {
          on: jest.fn(),
          unref: jest.fn(),
        };
        mockSpawn.mockReturnValue(mockChildProcess);

        mockChildProcess.on.mockImplementation(
          (event: string, callback: (code: number) => void) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 10);
            }
          }
        );

        await BrowserOpener.openBrowser('https://example.com');

        expect(mockSpawn).toHaveBeenCalledWith('cmd', ['/c', 'start', '', 'https://example.com'], {
          stdio: 'ignore',
          detached: true,
        });
      });
    });

    it('should open browser on macOS', async () => {
      await withPlatform('darwin', async () => {
        const mockChildProcess = {
          on: jest.fn(),
          unref: jest.fn(),
        };
        mockSpawn.mockReturnValue(mockChildProcess);

        mockChildProcess.on.mockImplementation(
          (event: string, callback: (code: number) => void) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 10);
            }
          }
        );

        await BrowserOpener.openBrowser('https://example.com');

        expect(mockSpawn).toHaveBeenCalledWith('open', ['https://example.com'], {
          stdio: 'ignore',
          detached: true,
        });
      });
    });

    it('should open browser on Linux', async () => {
      await withPlatform('linux', async () => {
        const mockChildProcess = {
          on: jest.fn(),
          unref: jest.fn(),
        };
        mockSpawn.mockReturnValue(mockChildProcess);

        mockChildProcess.on.mockImplementation(
          (event: string, callback: (code: number) => void) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 10);
            }
          }
        );

        await BrowserOpener.openBrowser('https://example.com');

        expect(mockSpawn).toHaveBeenCalledWith('xdg-open', ['https://example.com'], {
          stdio: 'ignore',
          detached: true,
        });
      });
    });

    it('should handle browser opening failure gracefully', async () => {
      const mockChildProcess = {
        on: jest.fn(),
        unref: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockChildProcess);

      mockChildProcess.on.mockImplementation((event: string, callback: (error: Error) => void) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Browser failed')), 10);
        }
      });

      // Should not throw, just log warning
      await BrowserOpener.openBrowser('https://example.com');

      expect(Logger.warning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to open browser automatically')
      );
      expect(Logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Please open this URL in your browser')
      );
    });

    it('should handle browser process exit with non-zero code', async () => {
      const mockChildProcess = {
        on: jest.fn(),
        unref: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockChildProcess);

      mockChildProcess.on.mockImplementation((event: string, callback: (code: number) => void) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 10);
        }
      });

      // Should not throw, just log warning
      await BrowserOpener.openBrowser('https://example.com');

      expect(Logger.warning).toHaveBeenCalledWith(
        expect.stringContaining('Browser process exited with code 1')
      );
      expect(Logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Please open this URL in your browser')
      );
    });

    it('should call unref on child process', async () => {
      const mockChildProcess = {
        on: jest.fn(),
        unref: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockChildProcess);

      mockChildProcess.on.mockImplementation((event: string, callback: (code: number) => void) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
      });

      await BrowserOpener.openBrowser('https://example.com');

      expect(mockChildProcess.unref).toHaveBeenCalled();
    });

    describe('URLs with special characters in openBrowser', () => {
      it(`should escape complex OAuth URL on Windows`, async () => {
        await withPlatform('win32', async () => {
          const mockChildProcess = {
            on: jest.fn(),
            unref: jest.fn(),
          };
          mockSpawn.mockReturnValue(mockChildProcess);

          mockChildProcess.on.mockImplementation(
            (event: string, callback: (code: number) => void) => {
              if (event === 'close') {
                setTimeout(() => callback(0), 10);
              }
            }
          );

          await BrowserOpener.openBrowser(complex_oauth_url);
          expect(mockSpawn).toHaveBeenCalledWith(
            'cmd',
            ['/c', 'start', '', windows_escaped_complex_oauth_url],
            {
              stdio: 'ignore',
              detached: true,
            }
          );
        });
      });

      it(`should escape complex OAuth URL on macOS`, async () => {
        await withPlatform('darwin', async () => {
          const mockChildProcess = {
            on: jest.fn(),
            unref: jest.fn(),
          };
          mockSpawn.mockReturnValue(mockChildProcess);

          mockChildProcess.on.mockImplementation(
            (event: string, callback: (code: number) => void) => {
              if (event === 'close') {
                setTimeout(() => callback(0), 10);
              }
            }
          );

          await BrowserOpener.openBrowser(complex_oauth_url);

          // For URLs with spaces or quotes, expect proper quoting
          expect(mockSpawn).toHaveBeenCalledWith('open', [nix_escaped_complex_oauth_url], {
            stdio: 'ignore',
            detached: true,
          });
        });
      });

      it(`should escape complex OAuth URL on Linux`, async () => {
        await withPlatform('linux', async () => {
          const mockChildProcess = {
            on: jest.fn(),
            unref: jest.fn(),
          };
          mockSpawn.mockReturnValue(mockChildProcess);

          mockChildProcess.on.mockImplementation(
            (event: string, callback: (code: number) => void) => {
              if (event === 'close') {
                setTimeout(() => callback(0), 10);
              }
            }
          );

          await BrowserOpener.openBrowser(complex_oauth_url);

          // For URLs with spaces or quotes, expect proper quoting
          expect(mockSpawn).toHaveBeenCalledWith('xdg-open', [nix_escaped_complex_oauth_url], {
            stdio: 'ignore',
            detached: true,
          });
        });
      });
    }); //end spec char
  });

  describe('getCommandForPlatform', () => {
    it('should return Windows command', () => {
      withPlatform('win32', () => {
        const result = BrowserOpener.getCommandForPlatform('https://example.com');

        expect(result).toEqual({
          command: 'cmd',
          args: ['/c', 'start', '', 'https://example.com'],
        });
      });
    });

    it('should return macOS command', () => {
      withPlatform('darwin', () => {
        const result = BrowserOpener.getCommandForPlatform('https://example.com');

        expect(result).toEqual({
          command: 'open',
          args: ['https://example.com'],
        });
      });
    });

    it('should return Linux command', () => {
      withPlatform('linux', () => {
        const result = BrowserOpener.getCommandForPlatform('https://example.com');

        expect(result).toEqual({
          command: 'xdg-open',
          args: ['https://example.com'],
        });
      });
    });

    it('should return Linux command for unknown platform', () => {
      withPlatform('freebsd', () => {
        const result = BrowserOpener.getCommandForPlatform('https://example.com');

        expect(result).toEqual({
          command: 'xdg-open',
          args: ['https://example.com'],
        });
      });
    });

    describe('URLs with special characters', () => {
      it(`should escape complex OAuth URL on Windows`, async () => {
        await withPlatform('win32', async () => {
          const result = BrowserOpener.getCommandForPlatform(complex_oauth_url);
          expect(result).toEqual({
            command: 'cmd',
            args: ['/c', 'start', '', windows_escaped_complex_oauth_url],
          });
        });
      });

      it(`should escape complex OAuth URL on macOS`, async () => {
        await withPlatform('darwin', async () => {
          const result = BrowserOpener.getCommandForPlatform(complex_oauth_url);
          expect(result).toEqual({
            command: 'open',
            args: [nix_escaped_complex_oauth_url],
          });
        });
      });

      it(`should escape complex OAuth URL on Linux`, async () => {
        await withPlatform('linux', async () => {
          const result = BrowserOpener.getCommandForPlatform(complex_oauth_url);
          expect(result).toEqual({
            command: 'xdg-open',
            args: [nix_escaped_complex_oauth_url],
          });
        });
      });
    });
  });
});
