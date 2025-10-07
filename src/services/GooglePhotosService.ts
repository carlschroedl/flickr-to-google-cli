import axios, { AxiosResponse } from 'axios';
import { GooglePhoto, GoogleAlbum, ApiCredentials } from '../types';
import { Logger } from '../utils/Logger';
import * as mime from 'mime-types';

export class GooglePhotosService {
  private clientId: string;
  private clientSecret: string;
  private refreshToken?: string;
  private accessToken?: string;
  private baseUrl = 'https://photoslibrary.googleapis.com/v1';

  constructor(credentials: ApiCredentials['google']) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    this.refreshToken = credentials.refreshToken;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    if (!this.refreshToken) {
      throw new Error('No refresh token available. Please re-authenticate.');
    }

    try {
      const response: AxiosResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      });

      this.accessToken = response.data.access_token;
      return this.accessToken!;
    } catch (error) {
      Logger.error('Failed to get access token:', error);
      throw error;
    }
  }

  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const token = await this.getAccessToken();

    try {
      const config: any = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      if (data) {
        config.data = data;
      }

      const response: AxiosResponse = await axios(config);
      return response.data;
    } catch (error) {
      Logger.error('Google Photos API request failed:', error);
      throw error;
    }
  }

  async createAlbum(title: string, description?: string): Promise<GoogleAlbum> {
    try {
      const response = await this.makeRequest('POST', '/albums', {
        album: {
          title,
          description,
        },
      });

      return {
        id: response.id,
        title: response.title,
        description: response.description,
        mediaItemsCount: 0,
        isWriteable: true,
      };
    } catch (error) {
      Logger.error('Failed to create album:', error);
      throw error;
    }
  }

  async getAlbums(): Promise<GoogleAlbum[]> {
    try {
      const response = await this.makeRequest('GET', '/albums');
      return response.albums || [];
    } catch (error) {
      Logger.error('Failed to get albums:', error);
      throw error;
    }
  }

  async uploadPhoto(photoBuffer: Buffer, filename: string, mimeType: string): Promise<string> {
    try {
      // First, upload the binary data
      const uploadToken = await this.uploadBinary(photoBuffer, mimeType);

      // Then, create the media item
      const response = await this.makeRequest('POST', '/mediaItems:batchCreate', {
        newMediaItems: [
          {
            description: filename,
            simpleMediaItem: {
              fileName: filename,
              uploadToken: uploadToken,
            },
          },
        ],
      });

      if (response.newMediaItemResults && response.newMediaItemResults.length > 0) {
        return response.newMediaItemResults[0].mediaItem.id;
      }

      throw new Error('Failed to create media item');
    } catch (error) {
      Logger.error('Failed to upload photo:', error);
      throw error;
    }
  }

  private async uploadBinary(buffer: Buffer, mimeType: string): Promise<string> {
    const token = await this.getAccessToken();

    try {
      const response: AxiosResponse = await axios.post(
        'https://photoslibrary.googleapis.com/v1/uploads',
        buffer,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': mimeType,
            'X-Goog-Upload-Protocol': 'raw',
            'X-Goog-Upload-File-Name': `photo_${Date.now()}.${mime.extension(mimeType)}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      Logger.error('Failed to upload binary data:', error);
      throw error;
    }
  }

  async addPhotosToAlbum(albumId: string, photoIds: string[]): Promise<void> {
    try {
      await this.makeRequest('POST', '/albums/' + albumId + ':batchAddMediaItems', {
        mediaItemIds: photoIds,
      });
    } catch (error) {
      Logger.error('Failed to add photos to album:', error);
      throw error;
    }
  }

  async updatePhotoMetadata(
    photoId: string,
    description?: string,
    location?: { latitude: number; longitude: number }
  ): Promise<void> {
    try {
      const updateData: any = {};

      if (description) {
        updateData.description = description;
      }

      if (location) {
        updateData.location = {
          latlng: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        };
      }

      await this.makeRequest('PATCH', `/mediaItems/${photoId}`, updateData);
    } catch (error) {
      Logger.error('Failed to update photo metadata:', error);
      throw error;
    }
  }

  async getAlbumPhotos(albumId: string): Promise<GooglePhoto[]> {
    try {
      const response = await this.makeRequest('GET', `/albums/${albumId}`);
      return response.mediaItems || [];
    } catch (error) {
      Logger.error('Failed to get album photos:', error);
      throw error;
    }
  }

  async searchPhotos(query?: string): Promise<GooglePhoto[]> {
    try {
      const response = await this.makeRequest('POST', '/mediaItems:search', {
        filters: query
          ? {
              includeArchivedMedia: false,
              contentFilter: {
                includedContentCategories: ['PHOTO'],
              },
            }
          : undefined,
        pageSize: 100,
      });

      return response.mediaItems || [];
    } catch (error) {
      Logger.error('Failed to search photos:', error);
      throw error;
    }
  }
}
