import fs from 'fs-extra';
import * as mime from 'mime-types';
import ora from 'ora';
import path from 'path';
import { ConfigManager } from '../config/ConfigManager';
import { FlickrService } from '../services/FlickrService';
import { GooglePhotosService } from '../services/GooglePhotosService';
import { FlickrAlbum, FlickrPhoto, TransferJob, TransferOptions } from '../types';
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

  async initialize(): Promise<void> {
    const credentials = await this.configManager.getCredentials();
    this.flickrService = new FlickrService(credentials.flickr);
    this.googlePhotosService = new GooglePhotosService(credentials.google);

    // Ensure job storage directory exists
    await fs.ensureDir(this.jobStoragePath);
  }

  async listFlickrAlbums(username?: string): Promise<void> {
    await this.initialize();

    const spinner = ora('Fetching Flickr albums...').start();

    try {
      const albums = await this.flickrService.getAlbums(username);
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
    await this.initialize();

    const spinner = ora('Starting transfer...').start();

    try {
      let albums: FlickrAlbum[];

      if (options.albumId) {
        // Transfer specific album
        const album = await this.flickrService.getAlbumDetails(options.albumId);
        albums = [album];
      } else {
        // Transfer all albums
        albums = await this.flickrService.getAlbums(options.username);
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
    const jobId = `job_${Date.now()}_${album.id}`;
    const job: TransferJob = {
      id: jobId,
      status: 'pending',
      albumId: album.id,
      albumTitle: album.title,
      totalPhotos: album.photos.length,
      processedPhotos: 0,
      startTime: new Date(),
    };

    await this.saveJob(job);

    Logger.info(`Transferring album: ${album.title} (${album.photos.length} photos)`);

    try {
      // Create Google Photos album
      const googleAlbum = await this.googlePhotosService.createAlbum(
        album.title,
        album.description
      );

      Logger.success(`Created Google Photos album: ${googleAlbum.title}`);

      // Process photos in batches
      const batchSize = options.batchSize || 10;
      const photoIds: string[] = [];

      for (let i = 0; i < album.photos.length; i += batchSize) {
        const batch = album.photos.slice(i, i + batchSize);
        const batchPhotoIds = await this.processPhotoBatch(batch, options.dryRun || false);
        photoIds.push(...batchPhotoIds);

        // Update job progress
        job.processedPhotos = Math.min(i + batchSize, album.photos.length);
        job.status = 'in_progress';
        await this.saveJob(job);

        Logger.progress(`Processing photos`, job.processedPhotos, job.totalPhotos);
      }

      // Add photos to album
      if (!options.dryRun && photoIds.length > 0) {
        await this.googlePhotosService.addPhotosToAlbum(googleAlbum.id, photoIds);
        Logger.success(`Added ${photoIds.length} photos to album`);
      }

      // Mark job as completed
      job.status = 'completed';
      job.endTime = new Date();
      await this.saveJob(job);

      Logger.success(`Album "${album.title}" transferred successfully!`);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = new Date();
      await this.saveJob(job);

      Logger.error(`Failed to transfer album "${album.title}":`, error);
      throw error;
    }
  }

  private async processPhotoBatch(photos: FlickrPhoto[], dryRun: boolean): Promise<string[]> {
    const photoIds: string[] = [];

    for (const photo of photos) {
      try {
        if (dryRun) {
          Logger.info(`[DRY RUN] Would transfer: ${photo.title}`);
          photoIds.push(`dry_run_${photo.id}`);
          continue;
        }

        // Download photo
        const photoBuffer = await this.flickrService.downloadPhoto(photo);

        // Determine MIME type
        const mimeType = mime.lookup(photo.url) || 'image/jpeg';
        const filename = `${photo.id}.${mime.extension(mimeType) || 'jpg'}`;

        // Upload to Google Photos
        const googlePhotoId = await this.googlePhotosService.uploadPhoto(
          photoBuffer,
          filename,
          mimeType
        );

        // Update metadata
        if (photo.description || (photo.latitude && photo.longitude)) {
          await this.googlePhotosService.updatePhotoMetadata(
            googlePhotoId,
            photo.description,
            photo.latitude && photo.longitude
              ? {
                  latitude: photo.latitude,
                  longitude: photo.longitude,
                }
              : undefined
          );
        }

        photoIds.push(googlePhotoId);
        Logger.debug(`Transferred photo: ${photo.title}`);
      } catch (error) {
        Logger.warning(`Failed to transfer photo "${photo.title}": ${error}`);
        // Continue with other photos
      }
    }

    return photoIds;
  }

  async checkTransferStatus(jobId?: string): Promise<void> {
    if (!jobId) {
      // List all jobs
      const jobs = await this.getAllJobs();

      if (jobs.length === 0) {
        Logger.info('No transfer jobs found');
        return;
      }

      Logger.info('\nTransfer Jobs:');
      Logger.info('==============');

      jobs.forEach(job => {
        const statusIcon = this.getStatusIcon(job.status);

        Logger.info(`${statusIcon} ${job.albumTitle} (${job.processedPhotos}/${job.totalPhotos})`);
        Logger.info(`   Status: ${job.status}`);
        Logger.info(`   Started: ${job.startTime.toLocaleString()}`);
        if (job.endTime) {
          Logger.info(`   Ended: ${job.endTime.toLocaleString()}`);
        }
        if (job.error) {
          Logger.info(`   Error: ${job.error}`);
        }
        Logger.info('');
      });
    } else {
      // Check specific job
      const job = await this.getJob(jobId);
      if (!job) {
        Logger.error(`Job ${jobId} not found`);
        return;
      }

      Logger.info(`\nJob Status: ${job.id}`);
      Logger.info('==============');
      Logger.info(`Album: ${job.albumTitle}`);
      Logger.info(`Status: ${job.status}`);
      Logger.info(`Progress: ${job.processedPhotos}/${job.totalPhotos}`);
      Logger.info(`Started: ${job.startTime.toLocaleString()}`);
      if (job.endTime) {
        Logger.info(`Ended: ${job.endTime.toLocaleString()}`);
      }
      if (job.error) {
        Logger.info(`Error: ${job.error}`);
      }
    }
  }

  private async saveJob(job: TransferJob): Promise<void> {
    const jobPath = path.join(this.jobStoragePath, `${job.id}.json`);
    await fs.writeJson(jobPath, job, { spaces: 2 });
  }

  private async getJob(jobId: string): Promise<TransferJob | null> {
    try {
      const jobPath = path.join(this.jobStoragePath, `${jobId}.json`);
      return await fs.readJson(jobPath);
    } catch {
      return null;
    }
  }

  private async getAllJobs(): Promise<TransferJob[]> {
    try {
      const files = await fs.readdir(this.jobStoragePath);
      const jobs: TransferJob[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const jobPath = path.join(this.jobStoragePath, file);
          const job = await fs.readJson(jobPath);
          jobs.push(job);
        }
      }

      return jobs.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    } catch {
      return [];
    }
  }

  private getStatusIcon(status: string): string {
    const statusIconMap: Record<string, string> = {
      completed: '✓',
      failed: 'X',
      in_progress: '⏳',
      pending: '⏸',
    };

    return statusIconMap[status] || '❓';
  }
}
