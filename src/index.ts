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
  .command('authenticate')
  .description('Complete OAuth authentication with Google Photos')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      await configManager.authenticate();
      Logger.success('Authentication completed successfully!');
    } catch (error) {
      Logger.error('Authentication failed:', error);
      process.exit(1);
    }
  });

program
  .command('list-albums')
  .description('List all Flickr albums')
  .option('--data-dir <directory>', 'Flickr bulk export data directory', './flickr-export')
  .action(async options => {
    try {
      const transfer = new FlickrToGoogleTransfer();
      await transfer.listFlickrAlbums(options.dataDir);
    } catch (error) {
      Logger.error('Failed to list albums:', error);
      process.exit(1);
    }
  });

program
  .command('transfer')
  .description('Transfer albums from Flickr to Google Photos')
  .option('-a, --album <albumId>', 'Specific album ID to transfer')
  .option('-d, --dry-run', 'Preview what would be transferred without actually transferring')
  .option('--batch-size <size>', 'Number of photos to process in each batch', '10')
  .option('--data-dir <directory>', 'Flickr bulk export data directory', './flickr-export')
  .option(
    '--sleep-time-between-batches <time>',
    'Time to sleep between batches in milliseconds',
    '10000'
  )
  .action(async options => {
    try {
      const transfer = new FlickrToGoogleTransfer();
      await transfer.transferAlbums({
        albumId: options.album,
        dryRun: options.dryRun,
        batchSize: parseInt(options.batchSize),
        dataDirectory: options.dataDir,
        sleepTimeBetweenBatches: parseInt(options.sleepTimeBetweenBatches),
      });
    } catch (error) {
      Logger.error('Transfer failed:', error);
      process.exit(1);
    }
  });

program.parse();
