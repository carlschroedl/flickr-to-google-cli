import { HapiOAuthHandler, getAuthCode } from '../../../src/utils/HapiOAuthHandler';

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

// Mock @hapi/hapi
const mockServer = {
  start: jest.fn(),
  stop: jest.fn(),
  inject: jest.fn(),
  route: jest.fn(),
};

jest.mock('@hapi/hapi', () => ({
  Server: jest.fn(() => mockServer),
}));

// Mock BrowserOpener
jest.mock('../../../src/utils/BrowserOpener', () => ({
  BrowserOpener: {
    openBrowser: jest.fn(),
  },
}));

describe('HapiOAuthHandler', () => {
  let handler: HapiOAuthHandler;
  let mockSpawn: jest.MockedFunction<any>;

  beforeEach(() => {
    handler = new HapiOAuthHandler();
    jest.clearAllMocks();

    // Get the mocked spawn function
    const { spawn } = require('child_process');
    mockSpawn = spawn;

    // Reset mock server
    mockServer.start.mockResolvedValue(undefined);
    mockServer.stop.mockResolvedValue(undefined);
  });

  describe('getAuthCode', () => {
    it('should handle timeout', async () => {
      const options = {
        authorizationUrl: 'https://example.com/auth',
        port: 3000,
        timeout: 100, // Very short timeout
      };

      // Mock spawn to return a mock child process
      const mockChildProcess = {
        on: jest.fn(),
        unref: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockChildProcess);

      await expect(handler.getAuthCode(options)).rejects.toThrow(
        'OAuth authentication timed out. Please try again.'
      );
    });
  });

  describe('makeSuccessPage', () => {
    it('should send success page HTML', async () => {
      const responseInfo = handler['makeSuccessPage']();

      expect(responseInfo.body).toContain('Authentication Successful');
      expect(responseInfo.statusCode).toBe(200);
    });
  });

  describe('makeErrorPage', () => {
    it('should send error page HTML with description', async () => {
      const responseInfo = handler['makeErrorPage']('test_error', 'Test error description');

      expect(responseInfo.body).toContain('Authentication Failed');
      expect(responseInfo.body).toContain('test_error');
      expect(responseInfo.body).toContain('Test error description');
      expect(responseInfo.statusCode).toBe(400);
    });

    it('should send error page HTML without description', async () => {
      const responseInfo = handler['makeErrorPage']('test_error');

      expect(responseInfo.body).toContain('test_error');
      expect(responseInfo.statusCode).toBe(400);
    });

    it('should prevent XSS attacks by escaping HTML in error parameter', async () => {
      const maliciousError = '<script>alert("XSS")</script>';
      const responseInfo = handler['makeErrorPage'](maliciousError);

      // Should NOT contain the raw script tag
      expect(responseInfo.body).not.toContain(maliciousError);

      // Should contain escaped version
      expect(responseInfo.body).toContain('&lt;script&gt;');
      expect(responseInfo.body).toContain('XSS');
      expect(responseInfo.body).toContain('&lt;/script&gt;');
      expect(responseInfo.statusCode).toBe(400);
    });

    it('should prevent XSS attacks by escaping HTML in description parameter', async () => {
      const maliciousDescription = '<img src=x onerror=alert("XSS2")>';
      const responseInfo = handler['makeErrorPage']('test_error', maliciousDescription);
      // Should NOT contain the raw img tag
      expect(responseInfo.body).not.toContain(maliciousDescription);

      // Should contain escaped version
      expect(responseInfo.body).toContain('&lt;img');
      expect(responseInfo.body).toContain('XSS2');
      expect(responseInfo.body).toContain('&gt;');
      expect(responseInfo.statusCode).toBe(400);
    });

    it('should escape multiple XSS attack vectors', async () => {
      const maliciousError = '"><script>alert(1)</script><div class="';
      const maliciousDescription = 'test" onload="alert(3)';
      const responseInfo = handler['makeErrorPage'](maliciousError, maliciousDescription);

      expect(responseInfo.body).not.toContain(maliciousError);
      expect(responseInfo.body).not.toContain(maliciousDescription);

      // Should contain escaped versions
      expect(responseInfo.body).toContain('&quot;');
      expect(responseInfo.body).toContain('&lt;');
      expect(responseInfo.body).toContain('&gt;');

      // Verify the actual escaped content (Handlebars uses different escaping)
      expect(responseInfo.body).toContain(
        '&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;div class&#x3D;&quot;'
      );
      expect(responseInfo.body).toContain('test&quot; onload&#x3D;&quot;alert(3)');
      expect(responseInfo.statusCode).toBe(400);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      const mockTimeoutId = setTimeout(() => {}, 1000);
      handler['timeoutId'] = mockTimeoutId;
      handler['server'] = {
        stop: jest.fn(),
      } as any;
      handler['resolvePromise'] = jest.fn();
      handler['rejectPromise'] = jest.fn();

      handler['cleanup']();

      expect(handler['timeoutId']).toBeNull();
      expect(handler['server']).toBeNull();
      // Promise callbacks are not nullified - they remain available for resolution
      expect(handler['resolvePromise']).toBeDefined();
      expect(handler['rejectPromise']).toBeDefined();
    });
  });
});

describe('getAuthCode function', () => {
  it('should create handler and call getAuthCode', async () => {
    const options = {
      authorizationUrl: 'https://example.com/auth',
      port: 3000,
    };

    // Mock the HapiOAuthHandler
    const mockHandler = {
      getAuthCode: jest.fn().mockResolvedValue({ code: 'test-code' }),
    };
    jest
      .spyOn(HapiOAuthHandler.prototype, 'getAuthCode')
      .mockImplementation(mockHandler.getAuthCode);

    const result = await getAuthCode(options);

    expect(result.code).toBe('test-code');
    expect(mockHandler.getAuthCode).toHaveBeenCalledWith(options);
  });
});
