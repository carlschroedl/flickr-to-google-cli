import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FlickrAlbum, FlickrPhoto } from '../types';
import { Logger } from '../utils/Logger';

export class FlickrService {
  private dataDirectory: string;

  constructor(dataDirectory: string) {
    this.dataDirectory = dataDirectory;
  }

  /**
   * Get user's albums (photosets) from bulk export
   */
  async getAlbums(): Promise<FlickrAlbum[]> {
    try {
      const albumsPath = join(this.dataDirectory, 'metadata', 'albums.json');

      if (!existsSync(albumsPath)) {
        throw new Error(`Albums metadata file not found: ${albumsPath}`);
      }

      const albumsData = JSON.parse(readFileSync(albumsPath, 'utf-8'));
      const albums: FlickrAlbum[] = [];

      for (const albumData of albumsData.albums) {
        const album = await this.getAlbumDetails(albumData.id);
        albums.push(album);
      }

      return albums;
    } catch (error) {
      Logger.error('Failed to get albums:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific album from bulk export
   */
  async getAlbumDetails(albumId: string): Promise<FlickrAlbum> {
    try {
      const albumsPath = join(this.dataDirectory, 'metadata', 'albums.json');

      if (!existsSync(albumsPath)) {
        throw new Error(`Albums metadata file not found: ${albumsPath}`);
      }

      const albumsData = JSON.parse(readFileSync(albumsPath, 'utf-8'));
      const albumData = albumsData.albums.find((album: any) => album.id === albumId);

      if (!albumData) {
        throw new Error(`Album ${albumId} not found`);
      }
      // Flickr randomly adds a photo with id 0 to the album, we need to filter it out
      albumData.photos = albumData.photos.filter((photoId: string) => photoId !== '0');
      // Get photos in the album
      const photos: FlickrPhoto[] = [];
      for (const photoId of albumData.photos) {
        try {
          const photo = await this.getPhotoInfo(photoId);
          photos.push(photo);
        } catch (error) {
          Logger.warning(`Failed to load photo ${photoId} for album ${albumId}:`, error);
        }
      }

      return {
        id: albumData.id,
        title: albumData.title,
        description: albumData.description,
        photoCount: parseInt(albumData.photo_count),
        photos,
        dateCreated: new Date(parseInt(albumData.created) * 1000).toISOString(),
        dateUpdated: new Date(parseInt(albumData.last_updated) * 1000).toISOString(),
      };
    } catch (error) {
      Logger.error(`Failed to get album details for ${albumId}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific photo from bulk export
   */
  async getPhotoInfo(photoId: string): Promise<FlickrPhoto> {
    try {
      const photoPath = join(this.dataDirectory, 'metadata', `photo_${photoId}.json`);

      if (!existsSync(photoPath)) {
        throw new Error(`Photo metadata file not found: ${photoPath}`);
      }

      const photoData = JSON.parse(readFileSync(photoPath, 'utf-8'));

      // Extract dimensions from filename or use defaults
      const dataFiles = this.getDataFiles();
      const photoFile = dataFiles.find(file => file.endsWith(`_${photoId}_o.jpg`));

      // Parse geo data if available
      let latitude: number | undefined;
      let longitude: number | undefined;
      if (photoData.geo && photoData.geo.length > 0) {
        const geo = photoData.geo[0];
        latitude = parseFloat(geo.latitude);
        longitude = parseFloat(geo.longitude);
      }

      // Parse tags
      const tags = photoData.tags ? photoData.tags.map((tag: any) => tag.tag) : [];

      return {
        id: photoData.id,
        title: photoData.name,
        description: photoData.description,
        url: photoFile ? join(this.dataDirectory, 'data', photoFile) : photoData.original,
        dateTaken: photoData.date_taken,
        dateUpload: photoData.date_imported,
        tags,
        latitude,
        longitude,
        width: 0, // Not available in bulk export
        height: 0, // Not available in bulk export
        secret: '', // Not available in bulk export
        server: '', // Not available in bulk export
        farm: 0, // Not available in bulk export
      };
    } catch (error) {
      Logger.error(`Failed to get photo info for ${photoId}:`, error);
      throw error;
    }
  }

  /**
   * Download a photo from the data directory
   */
  async getPhoto(photo: FlickrPhoto): Promise<Buffer> {
    try {
      // If URL is a local file path, read it directly
      if (photo.url.startsWith('/') || photo.url.includes('\\')) {
        return readFileSync(photo.url);
      }

      // Otherwise, try to find the file in the data directory
      const dataFiles = this.getDataFiles();
      const photoFile = dataFiles.find(file => file.endsWith(`_${photo.id}_o.jpg`));

      if (photoFile) {
        const filePath = join(this.dataDirectory, 'data', photoFile);
        return readFileSync(filePath);
      }

      throw new Error(`Photo file not found for photo ${photo.id}`);
    } catch (error) {
      Logger.error(`Failed to download photo ${photo.id}:`, error);
      throw error;
    }
  }

  /**
   * Get list of data files in the data directory
   */
  private getDataFiles(): string[] {
    try {
      const dataDir = join(this.dataDirectory, 'data');
      const fs = require('fs');
      return fs.readdirSync(dataDir).filter((file: string) => file.endsWith('.jpg'));
    } catch (error) {
      Logger.warning('Could not read data directory:', error);
      return [];
    }
  }
}
