import fs from 'fs-extra';
import ora from 'ora';
import path from 'path';
import { ConfigManager } from '../config/ConfigManager';
import { FlickrService } from '../services/FlickrService';
import { GooglePhotosService } from '../services/GooglePhotosService';
import { FlickrAlbum, FlickrPhoto, GoogleAlbum, TransferOptions } from '../types';
import { Logger } from '../utils/Logger';

export class FlickrToGoogleTransfer {
  private flickrService!: FlickrService;
  private googlePhotosService!: GooglePhotosService;
  private configManager: ConfigManager;
  private jobStoragePath: string;

  constructor() {
    this.configManager = new ConfigManager();
    this.jobStoragePath = path.join(process.cwd(), '.transfer-jobs');
  }

  async initialize(dataDirectory?: string): Promise<void> {
    const credentials = await this.configManager.getCredentials();
    // Use provided dataDirectory, environment variable, or default
    const flickrDataDirectory =
      dataDirectory || process.env.FLICKR_DATA_DIRECTORY || './flickr-export';
    this.flickrService = new FlickrService(flickrDataDirectory);
    this.googlePhotosService = new GooglePhotosService(credentials.google);

    // Ensure job storage directory exists
    await fs.ensureDir(this.jobStoragePath);
  }

  async listFlickrAlbums(dataDirectory?: string): Promise<void> {
    await this.initialize(dataDirectory);

    const spinner = ora('Fetching Flickr albums...').start();

    try {
      const albums = await this.flickrService.getAlbums();
      spinner.succeed(`Found ${albums.length} albums`);

      Logger.info('\nFlickr Albums:');
      Logger.info('==============');

      albums.forEach((album, index) => {
        Logger.info(`${index + 1}. ${album.title}`);
        Logger.info(`   ID: ${album.id}`);
        Logger.info(`   Photos: ${album.photoCount}`);
        Logger.info(
          `   Description: ${album.description.substring(0, 100)}${album.description.length > 100 ? '...' : ''}`
        );
        Logger.info('');
      });
    } catch (error) {
      spinner.fail('Failed to fetch albums');
      throw error;
    }
  }

  async transferAlbums(options: TransferOptions): Promise<void> {
    await this.initialize(options.dataDirectory);

    const spinner = ora('Starting transfer...').start();

    try {
      let albums: FlickrAlbum[];

      if (options.albumId) {
        // Transfer specific album
        const album = await this.flickrService.getAlbumDetails(options.albumId);
        albums = [album];
      } else {
        // Transfer all albums
        albums = await this.flickrService.getAlbums();
      }

      spinner.succeed(`Found ${albums.length} album(s) to transfer`);

      for (const album of albums) {
        await this.transferAlbum(album, options);
      }

      Logger.success('Transfer completed successfully!');
    } catch (error) {
      spinner.fail('Transfer failed');
      throw error;
    }
  }

  private async transferAlbum(album: FlickrAlbum, options: TransferOptions): Promise<void> {
    Logger.info(`Transferring album: ${album.title} (${album.photos.length} photos)`);

    try {
      // Create Google Photos album
      let googleAlbum: GoogleAlbum | null = null;
      // Warn if album has description since Google Photos doesn't support album descriptions
      if (album.description && album.description.trim()) {
        Logger.warning(
          `Album "${album.title}" (ID: ${album.id}) has a description, but Google Photos doesn't support album descriptions. The following description will not be transferred. "${album.description}"`
        );
      }
      if (!options.dryRun) {
        googleAlbum = await this.googlePhotosService.createAlbum(album.title);

        Logger.success(`Created Google Photos album: ${googleAlbum.title}`);
      } else {
        Logger.info(`[DRY RUN] Would create Google Photos album: ${album.title}`);
      }

      // Process photos in batches
      const batchSize = options.batchSize || 10;
      const photoIds: string[] = [];

      for (let i = 0; i < album.photos.length; i += batchSize) {
        if (i > 0) {
          //built in delay to avoid rate limiting
          Logger.debug(
            `Pausing for ${options.sleepTimeBetweenBatches} miliseconds to avoid rate limiting`
          );
          await new Promise(r => setTimeout(r, options.sleepTimeBetweenBatches));
        }
        const batch = album.photos.slice(i, i + batchSize);
        const batchPhotoIds = await this.processPhotoBatch(batch, options.dryRun || false);
        photoIds.push(...batchPhotoIds);
        // Update job progress
        const processedPhotos = Math.min(i + batchSize, album.photos.length);
        Logger.progress(`Processing photos`, processedPhotos, album.photos.length);
      }

      // Add photos to album
      if (options.dryRun) {
        Logger.info(`[DRY RUN] Would add ${photoIds.length} photos to album`);
      } else if (googleAlbum === null) {
        Logger.error('Google Photos album not found');
      } else if (photoIds.length === 0) {
        Logger.warning('No photos to add to album');
      } else {
        await this.googlePhotosService.addPhotosToAlbum(googleAlbum.id, photoIds);
        Logger.success(`Added ${photoIds.length} photos to album`);
      }

      Logger.success(`Album "${album.title}" transferred successfully!`);
    } catch (error) {
      Logger.error(`Failed to transfer album "${album.title}":`, error);
      throw error;
    }
  }

  private async processPhotoBatch(photos: FlickrPhoto[], dryRun: boolean): Promise<string[]> {
    const photoIds: string[] = [];

    for (const photo of photos) {
      try {
        if (dryRun) {
          Logger.info(`[DRY RUN] Would transfer: ${photo.id}`);
          photoIds.push(`dry_run_${photo.id}`);
          continue;
        } else {
          // Download photo
          const photoBuffer = await this.flickrService.getPhoto(photo);

          const googleDescription = this.createGoogleDescription(photo.name, photo.description);

          // Upload to Google Photos
          const googlePhotoId = await this.googlePhotosService.uploadPhoto(
            photoBuffer,
            photo.filename,
            googleDescription
          );

          photoIds.push(googlePhotoId);
          Logger.debug(`Transferred photo: ${photo.id}`);
        }
      } catch (error) {
        Logger.warning(`Failed to transfer photo "${photo.id}": ${error}`);
        // Continue with other photos
      }
    }

    return photoIds;
  }
  createGoogleDescription(
    flickrName: string | undefined,
    flickrDescription: string | undefined
  ): string {
    // Create Google Photos description by concatenating name and description
    let googleDescription: string = '';
    if (flickrName && flickrDescription) {
      googleDescription = `${flickrName} - ${flickrDescription}`;
    } else if (flickrName) {
      googleDescription = flickrName;
    } else if (flickrDescription) {
      googleDescription = flickrDescription;
    }
    return googleDescription;
  }
}
