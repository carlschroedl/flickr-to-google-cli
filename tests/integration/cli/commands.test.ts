import { exec } from 'child_process';
import path from 'path';

describe('CLI Commands Integration', () => {
  const cliPath = path.join(__dirname, '../../../dist/index.js');

  // Helper function to run CLI commands
  function cli(args: string[], cwd: string = process.cwd()) {
    return new Promise<{ code: number; error: any; stdout: string; stderr: string }>(resolve => {
      exec(
        `node ${path.resolve(cliPath)} ${args.join(' ')}`,
        { cwd, timeout: 5000 },
        (error, stdout, stderr) => {
          resolve({
            code: error && error.code ? error.code : 0,
            error,
            stdout,
            stderr,
          });
        }
      );
    });
  }

  describe('help command', () => {
    it('should show help information', async () => {
      const result = await cli(['--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Transfer photo albums from Flickr to Google Photos');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('setup');
      expect(result.stdout).toContain('list-albums');
      expect(result.stdout).toContain('transfer');
      expect(result.stdout).toContain('status');
    });
  });

  describe('version command', () => {
    it('should show version information', async () => {
      const result = await cli(['--version']);

      expect(result.code).toBe(0);
      expect(result.stdout.trim()).toBe('1.0.0');
    });
  });

  describe('list-albums command', () => {
    it('should list test albums', async () => {
      const dataDir = path.resolve(__dirname, '../example');
      const result = await cli(['list-albums', '--data-dir', dataDir]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Flickr Albums:');
      expect(result.stdout).toContain('Test Album');
      expect(result.stdout).toContain('Test Album 2');
    });
    it('should show help for list-albums command', async () => {
      const result = await cli(['list-albums', '--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('List all Flickr albums');
      expect(result.stdout).toContain('--data-dir');
    });
  });

  describe('transfer command', () => {
    it('should show help for transfer command', async () => {
      const result = await cli(['transfer', '--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Transfer albums from Flickr to Google Photos');
      expect(result.stdout).toContain('Options:');
      expect(result.stdout).toContain('--album');
      expect(result.stdout).toContain('--data-dir');
      expect(result.stdout).toContain('--dry-run');
      expect(result.stdout).toContain('--batch-size');
    });
  });

  describe('status command', () => {
    it('should show help for status command', async () => {
      const result = await cli(['status', '--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Check the status of a previous transfer');
      expect(result.stdout).toContain('Options:');
      expect(result.stdout).toContain('--job-id');
    });
  });

  describe('error handling', () => {
    it('should handle unknown commands gracefully', async () => {
      const result = await cli(['unknown-command']);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('unknown command');
    });

    it('should handle invalid options gracefully', async () => {
      const result = await cli(['--invalid-option']);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('unknown option');
    });
  });
});
