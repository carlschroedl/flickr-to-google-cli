import { LOG_PREFIXES, Logger } from '../../../src/utils/Logger';

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('info', () => {
    it('should log info message with blue color', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      Logger.info('Test info message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(LOG_PREFIXES.INFO),
        'Test info message'
      );
    });

    it('should log info message with additional arguments', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      Logger.info('Test message', 'arg1', 'arg2');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(LOG_PREFIXES.INFO),
        'Test message',
        'arg1',
        'arg2'
      );
    });
  });

  describe('success', () => {
    it('should log success message with green color', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      Logger.success('Test success message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(LOG_PREFIXES.SUCCESS),
        'Test success message'
      );
    });
  });

  describe('warning', () => {
    it('should log warning message with yellow color', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      Logger.warning('Test warning message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(LOG_PREFIXES.WARNING),
        'Test warning message'
      );
    });
  });

  describe('error', () => {
    it('should log error message with red color', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      Logger.error('Test error message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(LOG_PREFIXES.ERROR),
        'Test error message'
      );
    });
  });

  describe('debug', () => {
    it('should not log debug message when DEBUG is not set', () => {
      const originalDebug = process.env.DEBUG;
      delete process.env.DEBUG;

      const consoleSpy = jest.spyOn(console, 'log');
      Logger.debug('Test debug message');

      expect(consoleSpy).not.toHaveBeenCalled();

      process.env.DEBUG = originalDebug;
    });

    it('should log debug message when DEBUG is set', () => {
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = 'true';

      const consoleSpy = jest.spyOn(console, 'log');
      Logger.debug('Test debug message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(LOG_PREFIXES.DEBUG),
        'Test debug message'
      );

      process.env.DEBUG = originalDebug;
    });
  });

  describe('progress', () => {
    it('should write progress to stdout', () => {
      const stdoutSpy = jest.spyOn(process.stdout, 'write');
      Logger.progress('Processing', 5, 10);

      expect(stdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining(LOG_PREFIXES.PROGRESS)
      );
      expect(stdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('50%')
      );
      expect(stdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('(5/10)')
      );
    });

    it('should write newline when progress is complete', () => {
      const stdoutSpy = jest.spyOn(process.stdout, 'write');
      Logger.progress('Processing', 10, 10);

      expect(stdoutSpy).toHaveBeenCalledWith('\n');
    });
  });
});
