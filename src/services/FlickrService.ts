import axios, { AxiosResponse } from 'axios';
import { FlickrPhoto, FlickrAlbum, ApiCredentials } from '../types';
import { Logger } from '../utils/Logger';

export class FlickrService {
  private apiKey: string;
  private apiSecret: string;
  private userId?: string;
  private baseUrl = 'https://api.flickr.com/services/rest/';

  constructor(credentials: ApiCredentials['flickr']) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.userId = credentials.userId;
  }

  private async makeRequest(method: string, params: Record<string, any> = {}): Promise<any> {
    const requestParams = {
      method,
      api_key: this.apiKey,
      format: 'json',
      nojsoncallback: 1,
      ...params
    };

    try {
      const response: AxiosResponse = await axios.get(this.baseUrl, { params: requestParams });
      
      if (response.data.stat === 'fail') {
        throw new Error(`Flickr API Error: ${response.data.message}`);
      }

      return response.data;
    } catch (error) {
      Logger.error('Flickr API request failed:', error);
      throw error;
    }
  }

  async getUserId(username?: string): Promise<string> {
    if (this.userId) {
      return this.userId;
    }

    if (!username) {
      throw new Error('Username is required to get user ID');
    }

    try {
      const response = await this.makeRequest('flickr.people.findByUsername', { username });
      return response.user.nsid;
    } catch (error) {
      Logger.error('Failed to get user ID:', error);
      throw error;
    }
  }

  async getAlbums(userId?: string): Promise<FlickrAlbum[]> {
    const targetUserId = userId || await this.getUserId();
    
    try {
      const response = await this.makeRequest('flickr.photosets.getList', {
        user_id: targetUserId,
        per_page: 500
      });

      const albums: FlickrAlbum[] = [];
      
      for (const photoset of response.photosets.photoset) {
        const album = await this.getAlbumDetails(photoset.id);
        albums.push(album);
      }

      return albums;
    } catch (error) {
      Logger.error('Failed to get albums:', error);
      throw error;
    }
  }

  async getAlbumDetails(albumId: string): Promise<FlickrAlbum> {
    try {
      const response = await this.makeRequest('flickr.photosets.getInfo', {
        photoset_id: albumId
      });

      const photoset = response.photoset;
      
      // Get photos in the album
      const photosResponse = await this.makeRequest('flickr.photosets.getPhotos', {
        photoset_id: albumId,
        per_page: 500,
        extras: 'description,date_taken,date_upload,tags,geo,url_o,url_l,url_m,url_s,o_dims'
      });

      const photos: FlickrPhoto[] = photosResponse.photoset.photo.map((photo: any) => ({
        id: photo.id,
        title: photo.title,
        description: photo.description?._content || '',
        url: photo.url_o || photo.url_l || photo.url_m || photo.url_s,
        dateTaken: photo.datetaken,
        dateUpload: photo.dateupload,
        tags: photo.tags ? photo.tags.split(' ') : [],
        latitude: photo.latitude ? parseFloat(photo.latitude) : undefined,
        longitude: photo.longitude ? parseFloat(photo.longitude) : undefined,
        width: parseInt(photo.width_o || photo.width_l || photo.width_m || photo.width_s),
        height: parseInt(photo.height_o || photo.height_l || photo.height_m || photo.height_s),
        secret: photo.secret,
        server: photo.server,
        farm: photo.farm
      }));

      return {
        id: photoset.id,
        title: photoset.title._content,
        description: photoset.description._content,
        photoCount: parseInt(photoset.photos),
        photos,
        dateCreated: photoset.date_create,
        dateUpdated: photoset.date_update
      };
    } catch (error) {
      Logger.error(`Failed to get album details for ${albumId}:`, error);
      throw error;
    }
  }

  async getPhotoInfo(photoId: string): Promise<FlickrPhoto> {
    try {
      const response = await this.makeRequest('flickr.photos.getInfo', {
        photo_id: photoId
      });

      const photo = response.photo;
      
      return {
        id: photo.id,
        title: photo.title._content,
        description: photo.description._content,
        url: `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_o.jpg`,
        dateTaken: photo.dates.taken,
        dateUpload: photo.dates.posted,
        tags: photo.tags.tag ? photo.tags.tag.map((tag: any) => tag.raw) : [],
        latitude: photo.location ? parseFloat(photo.location.latitude) : undefined,
        longitude: photo.location ? parseFloat(photo.location.longitude) : undefined,
        width: parseInt(photo.widths.o || photo.widths.l || photo.widths.m || photo.widths.s),
        height: parseInt(photo.heights.o || photo.heights.l || photo.heights.m || photo.heights.s),
        secret: photo.secret,
        server: photo.server,
        farm: photo.farm
      };
    } catch (error) {
      Logger.error(`Failed to get photo info for ${photoId}:`, error);
      throw error;
    }
  }

  async downloadPhoto(photo: FlickrPhoto): Promise<Buffer> {
    try {
      const response = await axios.get(photo.url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    } catch (error) {
      Logger.error(`Failed to download photo ${photo.id}:`, error);
      throw error;
    }
  }
}
