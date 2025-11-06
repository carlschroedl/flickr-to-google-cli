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

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining(LOG_PREFIXES.PROGRESS));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('50%'));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('(5/10)'));
    });

    it('should write newline when progress is complete', () => {
      const stdoutSpy = jest.spyOn(process.stdout, 'write');
      Logger.progress('Processing', 10, 10);

      expect(stdoutSpy).toHaveBeenCalledWith('\n');
    });
  });

  describe('row', () => {
    it('should output values separated by tabs', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      Logger.row(['Title', 'Photo Count']);

      expect(consoleSpy).toHaveBeenCalledWith('Title\tPhoto Count');
    });

    it('should sanitize tabs in values by replacing with spaces', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      Logger.row(['Album with\ttab', '5']);

      expect(consoleSpy).toHaveBeenCalledWith('Album with tab\t5');
    });

    it('should sanitize newlines in values by replacing with spaces', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      Logger.row(['Album with\nnewline', '10']);

      expect(consoleSpy).toHaveBeenCalledWith('Album with newline\t10');
    });

    it('should sanitize carriage returns in values by replacing with spaces', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      Logger.row(['Album with\rreturn', '15']);

      expect(consoleSpy).toHaveBeenCalledWith('Album with return\t15');
    });

    it('should sanitize all special characters in multiple values', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      Logger.row(['Album\twith\nmultiple\rchars', '20', 'Another\tvalue']);

      expect(consoleSpy).toHaveBeenCalledWith('Album with multiple chars\t20\tAnother value');
    });

    it('should handle empty array', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      Logger.row([]);

      expect(consoleSpy).toHaveBeenCalledWith('');
    });

    it('should handle single value', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      Logger.row(['Single Value']);

      expect(consoleSpy).toHaveBeenCalledWith('Single Value');
    });
  });
});
