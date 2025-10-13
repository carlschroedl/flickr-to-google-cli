#!/usr/bin/env node

import { Command } from 'commander';
import { ConfigManager } from './config/ConfigManager';
import { FlickrToGoogleTransfer } from './transfer/FlickrToGoogleTransfer';
import { Logger } from './utils/Logger';

const program = new Command();

program
  .name('flickr-to-google')
  .description('Transfer photo albums from Flickr to Google Photos while preserving metadata')
  .version('1.0.0');

program
  .command('setup')
  .description('Set up API credentials and configuration')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      await configManager.setupCredentials();
      Logger.success('Configuration completed successfully!');
    } catch (error) {
      Logger.error('Setup failed:', error);
      process.exit(1);
    }
  });

program
  .command('list-albums')
  .description('List all Flickr albums')
  .action(async () => {
    try {
      const transfer = new FlickrToGoogleTransfer();
      await transfer.listFlickrAlbums();
    } catch (error) {
      Logger.error('Failed to list albums:', error);
      process.exit(1);
    }
  });

program
  .command('transfer')
  .description('Transfer albums from Flickr to Google Photos')
  .option('-a, --album <albumId>', 'Specific album ID to transfer')
  .option('-u, --user <username>', 'Flickr username')
  .option('-d, --dry-run', 'Preview what would be transferred without actually transferring')
  .option('--batch-size <size>', 'Number of photos to process in each batch', '10')
  .action(async options => {
    try {
      const transfer = new FlickrToGoogleTransfer();
      await transfer.transferAlbums({
        albumId: options.album,
        username: options.user,
        dryRun: options.dryRun,
        batchSize: parseInt(options.batchSize),
      });
    } catch (error) {
      Logger.error('Transfer failed:', error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check the status of a previous transfer')
  .option('-j, --job-id <jobId>', 'Job ID to check status for')
  .action(async options => {
    try {
      const transfer = new FlickrToGoogleTransfer();
      await transfer.checkTransferStatus(options.jobId);
    } catch (error) {
      Logger.error('Failed to check status:', error);
      process.exit(1);
    }
  });

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  Logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

program.parse();
