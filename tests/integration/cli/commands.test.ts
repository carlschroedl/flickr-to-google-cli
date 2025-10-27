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
        child.unref();
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
        child.unref();
        done();
      });
    });
  });

  describe('list-albums command', () => {
    it('should list test albums', async () => {
      /**
       * This test is implemented with the async/await pattern because the test hung indefinitely.
       * when implemented with done().
       */
      console.log('cwd:' + process.cwd());
      const dataDir = path.resolve(__dirname, '../example');

      const child = spawn('node', [cliPath, 'list-albums', '--data-dir', dataDir], {
        stdio: 'pipe',
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', data => {
        output += data.toString();
      });

      child.stderr.on('data', data => {
        errorOutput += data.toString();
      });

      const exitCode = await new Promise<number>(resolve => {
        child.on('close', code => {
          child.unref();
          if (code == null) {
            fail('The child process did not close with an exit code');
          } else {
            resolve(code);
          }
        });
      });

      expect(exitCode).toBe(0);
      expect(output).toContain('Flickr Albums:');
      expect(output).toContain('Test Album');
      expect(output).toContain('Test Album 2');
    }, 10000); // 10 second timeout
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
        child.unref();
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
        child.unref();
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
        child.unref();
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
        child.unref();
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
        child.unref();
        done();
      });
    });
  });
});
