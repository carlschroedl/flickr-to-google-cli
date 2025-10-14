import { spawn } from 'child_process';
import path from 'path';

describe('CLI Commands Integration', () => {
  const cliPath = path.join(__dirname, '../../../dist/index.js');

  describe('help command', () => {
    it('should show help information', done => {
      const child = spawn('node', [cliPath, '--help'], { stdio: 'pipe' });

      let output = '';
      child.stdout.on('data', data => {
        output += data.toString();
      });

      child.on('close', code => {
        expect(code).toBe(0);
        expect(output).toContain('Transfer photo albums from Flickr to Google Photos');
        expect(output).toContain('Commands:');
        expect(output).toContain('setup');
        expect(output).toContain('list-albums');
        expect(output).toContain('transfer');
        expect(output).toContain('status');
        done();
      });
    });
  });

  describe('version command', () => {
    it('should show version information', done => {
      const child = spawn('node', [cliPath, '--version'], { stdio: 'pipe' });

      let output = '';
      child.stdout.on('data', data => {
        output += data.toString();
      });

      child.on('close', code => {
        expect(code).toBe(0);
        expect(output.trim()).toBe('1.0.0');
        done();
      });
    });
  });

  describe('list-albums command', () => {
    it('should list test albums', done => {
      const child = spawn(
        'node',
        [cliPath, 'list-albums', '--data-dir', './tests/integration/example'],
        { stdio: 'pipe' }
      );

      let output = '';
      child.stdout.on('data', data => {
        output += data.toString();
      });

      child.on('close', code => {
        expect(code).toBe(0);
        expect(output).toContain('Found 2 albums');
        done();
      });
    });
    it('should show help for list-albums command', done => {
      const child = spawn('node', [cliPath, 'list-albums', '--help'], { stdio: 'pipe' });

      let output = '';
      child.stdout.on('data', data => {
        output += data.toString();
      });

      child.on('close', code => {
        expect(code).toBe(0);
        expect(output).toContain('List all Flickr albums');
        expect(output).toContain('--data-dir');
        done();
      });
    });
  });

  describe('transfer command', () => {
    it('should show help for transfer command', done => {
      const child = spawn('node', [cliPath, 'transfer', '--help'], { stdio: 'pipe' });

      let output = '';
      child.stdout.on('data', data => {
        output += data.toString();
      });

      child.on('close', code => {
        expect(code).toBe(0);
        expect(output).toContain('Transfer albums from Flickr to Google Photos');
        expect(output).toContain('Options:');
        expect(output).toContain('--album');
        expect(output).toContain('--data-dir');
        expect(output).toContain('--dry-run');
        expect(output).toContain('--batch-size');
        done();
      });
    });
  });

  describe('status command', () => {
    it('should show help for status command', done => {
      const child = spawn('node', [cliPath, 'status', '--help'], { stdio: 'pipe' });

      let output = '';
      child.stdout.on('data', data => {
        output += data.toString();
      });

      child.on('close', code => {
        expect(code).toBe(0);
        expect(output).toContain('Check the status of a previous transfer');
        expect(output).toContain('Options:');
        expect(output).toContain('--job-id');
        done();
      });
    });
  });

  describe('error handling', () => {
    it('should handle unknown commands gracefully', done => {
      const child = spawn('node', [cliPath, 'unknown-command'], { stdio: 'pipe' });

      let errorOutput = '';
      child.stderr.on('data', data => {
        errorOutput += data.toString();
      });

      child.on('close', code => {
        expect(code).toBe(1);
        expect(errorOutput).toContain('unknown command');
        done();
      });
    });

    it('should handle invalid options gracefully', done => {
      const child = spawn('node', [cliPath, 'list-albums', '--invalid-option'], { stdio: 'pipe' });

      let errorOutput = '';
      child.stderr.on('data', data => {
        errorOutput += data.toString();
      });

      child.on('close', code => {
        expect(code).toBe(1);
        expect(errorOutput).toContain('unknown option');
        done();
      });
    });
  });
});
