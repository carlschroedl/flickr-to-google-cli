import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { ApiCredentials, GoogleAlbum } from '../types';
import { Logger } from '../utils/Logger';

export class GooglePhotosService {
  private auth: OAuth2Client;
  private baseUrl = 'https://photoslibrary.googleapis.com/v1';

  constructor(credentials: ApiCredentials['google']) {
    this.auth = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      'http://localhost:3000/oauth2callback'
    );

    // Set credentials if available
    if (credentials.accessToken && credentials.refreshToken) {
      this.auth.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        expiry_date: credentials.tokenExpiry,
      });
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.auth.credentials || !this.auth.credentials.access_token) {
      throw new Error('Not authenticated. Please run "flickr-to-google authenticate" first.');
    }

    // Check if token is expired and refresh if needed
    if (this.auth.credentials.expiry_date && Date.now() >= this.auth.credentials.expiry_date) {
      Logger.info('Access token expired, refreshing...');
      try {
        await this.auth.refreshAccessToken();
        Logger.info('Access token refreshed successfully');
      } catch (error) {
        Logger.error('Failed to refresh access token:', error);
        throw new Error(
          'Authentication expired. Please run "flickr-to-google authenticate" again.'
        );
      }
    }
  }

  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    await this.ensureAuthenticated();

    const token = this.auth.credentials.access_token;
    const url = `${this.baseUrl}${endpoint}`;

    const options: any = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.data = data;
    }

    try {
      const response = await this.auth.request(options);
      return response.data;
    } catch (error) {
      Logger.error(`API request failed: ${method} ${endpoint}`, error);
      throw error;
    }
  }

  async createAlbum(title: string): Promise<GoogleAlbum> {
    try {
      const response = await this.makeRequest('POST', '/albums', {
        album: {
          title,
        },
      });

      return {
        id: response.id!,
        title: response.title!,
        mediaItemsCount: response.mediaItemsCount || 0,
        coverPhotoBaseUrl: response.coverPhotoBaseUrl,
        isWriteable: response.isWriteable || false,
      };
    } catch (error) {
      Logger.error('Failed to create album:', error);
      throw error;
    }
  }

  async getAlbums(): Promise<GoogleAlbum[]> {
    try {
      const response = await this.makeRequest('GET', '/albums?pageSize=50');

      return (response.albums || []).map((album: any) => ({
        id: album.id!,
        title: album.title!,
        description: album.description,
        mediaItemsCount: album.mediaItemsCount || 0,
        coverPhotoBaseUrl: album.coverPhotoBaseUrl,
        isWriteable: album.isWriteable || false,
      }));
    } catch (error) {
      Logger.error('Failed to get albums:', error);
      throw error;
    }
  }

  async uploadPhoto(photoBuffer: Buffer, filename: string, description?: string): Promise<string> {
    await this.ensureAuthenticated();

    try {
      // First, upload the media
      const uploadResponse = await this.auth.request({
        method: 'POST',
        url: 'https://photoslibrary.googleapis.com/v1/uploads',
        headers: {
          Authorization: `Bearer ${this.auth.credentials.access_token}`,
          'Content-Type': 'application/octet-stream',
          'X-Goog-Upload-Protocol': 'raw',
          'X-Goog-Upload-File-Name': filename,
        },
        data: photoBuffer,
      });

      const uploadToken = uploadResponse.data;

      const newMediaItem: any = {
        simpleMediaItem: {
          uploadToken,
        },
      };

      if (description) {
        newMediaItem.description = description;
      }

      // Then, create the media item
      const createResponse = await this.makeRequest('POST', '/mediaItems:batchCreate', {
        newMediaItems: [newMediaItem],
      });

      return createResponse.newMediaItemResults[0].mediaItem.id;
    } catch (error) {
      Logger.error('Failed to upload photo:', error);
      throw error;
    }
  }

  async addPhotosToAlbum(albumId: string, photoIds: string[]): Promise<void> {
    try {
      await this.makeRequest('POST', `/albums/${albumId}:batchAddMediaItems`, {
        mediaItemIds: photoIds,
      });
    } catch (error) {
      Logger.error('Failed to add photos to album:', error);
      throw error;
    }
  }

  async updatePhotoMetadata(
    photoId: string,
    description?: string | null,
    location?: { latitude: number; longitude: number },
    dateCreated?: string
  ): Promise<void> {
    try {
      const updateBody: any = {
        id: photoId,
      };

      if (description) {
        updateBody.description = description;
      }

      if (location) {
        updateBody.location = {
          latlng: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        };
      }
      if (dateCreated) {
        updateBody.creationTime = dateCreated;
      }
      await this.makeRequest('PATCH', `/mediaItems/${photoId}`, updateBody);
    } catch (error) {
      Logger.error('Failed to update photo metadata:', error);
      throw error;
    }
  }

  async getAccessToken(): Promise<string> {
    await this.ensureAuthenticated();
    if (!this.auth.credentials.access_token) {
      throw new Error('No access token found');
    } else {
      return this.auth.credentials.access_token;
    }
  }
}
