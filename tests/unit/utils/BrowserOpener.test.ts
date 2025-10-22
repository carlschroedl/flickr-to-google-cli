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
  });
});
