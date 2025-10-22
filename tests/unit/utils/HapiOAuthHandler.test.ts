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

  describe('sendSuccessPage', () => {
    it('should send success page HTML', async () => {
      const mockH = {
        response: jest.fn().mockReturnThis(),
        type: jest.fn().mockReturnThis(),
      };

      handler['sendSuccessPage'](mockH);

      expect(mockH.response).toHaveBeenCalledWith(
        expect.stringContaining('Authentication Successful')
      );
      expect(mockH.type).toHaveBeenCalledWith('text/html');
    });
  });

  describe('sendErrorPage', () => {
    it('should send error page HTML with description', async () => {
      const mockH = {
        response: jest.fn().mockReturnThis(),
        type: jest.fn().mockReturnThis(),
      };

      handler['sendErrorPage'](mockH, 'test_error', 'Test error description');

      expect(mockH.response).toHaveBeenCalledWith(expect.stringContaining('Authentication Failed'));
      expect(mockH.response).toHaveBeenCalledWith(expect.stringContaining('test_error'));
      expect(mockH.response).toHaveBeenCalledWith(
        expect.stringContaining('Test error description')
      );
      expect(mockH.type).toHaveBeenCalledWith('text/html');
    });

    it('should send error page HTML without description', async () => {
      const mockH = {
        response: jest.fn().mockReturnThis(),
        type: jest.fn().mockReturnThis(),
      };

      handler['sendErrorPage'](mockH, 'test_error');

      expect(mockH.response).toHaveBeenCalledWith(expect.stringContaining('test_error'));
      expect(mockH.type).toHaveBeenCalledWith('text/html');
    });

    it('should prevent XSS attacks by escaping HTML in error parameter', async () => {
      const mockH = {
        response: jest.fn().mockReturnThis(),
        type: jest.fn().mockReturnThis(),
      };

      const maliciousError = '<script>alert("XSS")</script>';
      handler['sendErrorPage'](mockH, maliciousError);

      const htmlResponse = mockH.response.mock.calls[0][0];

      // Should NOT contain the raw script tag
      expect(htmlResponse).not.toContain('<script>alert("XSS")</script>');

      // Should contain escaped version
      expect(htmlResponse).toContain('&lt;script&gt;');
      expect(htmlResponse).toContain('&lt;/script&gt;');
    });

    it('should prevent XSS attacks by escaping HTML in description parameter', async () => {
      const mockH = {
        response: jest.fn().mockReturnThis(),
        type: jest.fn().mockReturnThis(),
      };

      const maliciousDescription = '<img src=x onerror=alert("XSS2")>';
      handler['sendErrorPage'](mockH, 'access_denied', maliciousDescription);

      const htmlResponse = mockH.response.mock.calls[0][0];

      // Should NOT contain the raw img tag
      expect(htmlResponse).not.toContain('<img src=x onerror=alert("XSS2")>');

      // Should contain escaped version
      expect(htmlResponse).toContain('&lt;img');
      expect(htmlResponse).toContain('&gt;');
    });

    it('should escape multiple XSS attack vectors', async () => {
      const mockH = {
        response: jest.fn().mockReturnThis(),
        type: jest.fn().mockReturnThis(),
      };

      const maliciousError = '"><script>alert(1)</script><div class="';
      const maliciousDescription = 'test" onload="alert(3)';
      handler['sendErrorPage'](mockH, maliciousError, maliciousDescription);

      const htmlResponse = mockH.response.mock.calls[0][0];

      // Should NOT contain any unescaped dangerous characters
      expect(htmlResponse).not.toContain('"><script>');
      expect(htmlResponse).not.toContain('" onload="alert');
      expect(htmlResponse).not.toContain('</script><div');

      // Should contain escaped versions
      expect(htmlResponse).toContain('&quot;');
      expect(htmlResponse).toContain('&lt;');
      expect(htmlResponse).toContain('&gt;');

      // Verify the actual escaped content (Handlebars uses different escaping)
      expect(htmlResponse).toContain(
        '&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;div class&#x3D;&quot;'
      );
      expect(htmlResponse).toContain('test&quot; onload&#x3D;&quot;alert(3)');
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
      expect(handler['resolvePromise']).toBeNull();
      expect(handler['rejectPromise']).toBeNull();
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
