import { FlickrService } from '../../../src/services/FlickrService';
import { ApiCredentials } from '../../../src/types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FlickrService', () => {
  let flickrService: FlickrService;
  const mockCredentials: ApiCredentials['flickr'] = {
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    userId: 'test-user-id'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    flickrService = new FlickrService(mockCredentials);
  });

  describe('constructor', () => {
    it('should initialize with credentials', () => {
      expect(flickrService).toBeInstanceOf(FlickrService);
    });
  });

  describe('getUserId', () => {
    it('should return stored userId when available', async () => {
      const result = await flickrService.getUserId();
      expect(result).toBe('test-user-id');
    });

    it('should fetch userId from API when username provided', async () => {
      const serviceWithoutUserId = new FlickrService({
        apiKey: 'test-key',
        apiSecret: 'test-secret'
      });

      const mockResponse = {
        data: {
          stat: 'ok',
          user: {
            nsid: 'fetched-user-id'
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await serviceWithoutUserId.getUserId('test-username');

      expect(result).toBe('fetched-user-id');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.flickr.com/services/rest/',
        {
          params: expect.objectContaining({
            method: 'flickr.people.findByUsername',
            username: 'test-username'
          })
        }
      );
    });

    it('should throw error when username required but not provided', async () => {
      const serviceWithoutUserId = new FlickrService({
        apiKey: 'test-key',
        apiSecret: 'test-secret'
      });

      await expect(serviceWithoutUserId.getUserId()).rejects.toThrow(
        'Username is required to get user ID'
      );
    });

    it('should throw error when API call fails', async () => {
      const serviceWithoutUserId = new FlickrService({
        apiKey: 'test-key',
        apiSecret: 'test-secret'
      });

      const mockResponse = {
        data: {
          stat: 'fail',
          message: 'API Error'
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await expect(serviceWithoutUserId.getUserId('test-username')).rejects.toThrow(
        'Flickr API Error: API Error'
      );
    });
  });

  describe('getAlbums', () => {
    it('should fetch and return albums', async () => {
      const mockAlbumsResponse = {
        data: {
          stat: 'ok',
          photosets: {
            photoset: [
              { id: 'album1', title: { _content: 'Album 1' } }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockAlbumsResponse);

      // Mock the getAlbumDetails method to return the expected album
      jest.spyOn(flickrService, 'getAlbumDetails').mockResolvedValue({
        id: 'album1',
        title: 'Album 1',
        description: 'Description 1',
        photoCount: 1,
        photos: [{
          id: 'photo1',
          title: 'Photo 1',
          description: 'Description',
          url: 'https://example.com/photo1.jpg',
          dateTaken: '2023-01-01',
          dateUpload: '1234567890',
          tags: ['tag1'],
          latitude: 40.7128,
          longitude: -74.0060,
          width: 1920,
          height: 1080,
          secret: 'secret1',
          server: 'server1',
          farm: 1
        }],
        dateCreated: '1234567890',
        dateUpdated: '1234567890'
      });

      const albums = await flickrService.getAlbums();

      expect(albums).toHaveLength(1);
      expect(albums[0].id).toBe('album1');
      expect(albums[0].title).toBe('Album 1');
      expect(albums[0].photos).toHaveLength(1);
    });

    it('should throw error when API call fails', async () => {
      const mockResponse = {
        data: {
          stat: 'fail',
          message: 'API Error'
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await expect(flickrService.getAlbums()).rejects.toThrow('Flickr API Error: API Error');
    });
  });

  describe('getAlbumDetails', () => {
    it('should fetch album details and photos', async () => {
      const mockAlbumInfoResponse = {
        data: {
          stat: 'ok',
          photoset: {
            id: 'album1',
            title: { _content: 'Album 1' },
            description: { _content: 'Description 1' },
            photos: '2',
            date_create: '1234567890',
            date_update: '1234567890'
          }
        }
      };

      const mockPhotosResponse = {
        data: {
          stat: 'ok',
          photoset: {
            photo: [
              {
                id: 'photo1',
                title: 'Photo 1',
                description: { _content: 'Description' },
                url_o: 'https://example.com/photo1.jpg',
                datetaken: '2023-01-01',
                dateupload: '1234567890',
                tags: 'tag1 tag2',
                latitude: '40.7128',
                longitude: '-74.0060',
                width_o: '1920',
                height_o: '1080',
                secret: 'secret1',
                server: 'server1',
                farm: 1
              }
            ]
          }
        }
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockAlbumInfoResponse)
        .mockResolvedValueOnce(mockPhotosResponse);

      const album = await flickrService.getAlbumDetails('album1');

      expect(album.id).toBe('album1');
      expect(album.title).toBe('Album 1');
      expect(album.description).toBe('Description 1');
      expect(album.photoCount).toBe(2);
      expect(album.photos).toHaveLength(1);
      expect(album.photos[0].id).toBe('photo1');
    });
  });

  describe('downloadPhoto', () => {
    it('should download photo and return buffer', async () => {
      const mockPhoto = {
        id: 'photo1',
        url: 'https://example.com/photo1.jpg',
        title: 'Photo 1',
        description: 'Description',
        dateTaken: '2023-01-01',
        dateUpload: '1234567890',
        tags: ['tag1'],
        width: 1920,
        height: 1080,
        secret: 'secret1',
        server: 'server1',
        farm: 1
      };

      const mockBuffer = Buffer.from('mock image data');
      const mockResponse = {
        data: mockBuffer
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await flickrService.downloadPhoto(mockPhoto);

      expect(result).toEqual(mockBuffer);
      expect(mockedAxios.get).toHaveBeenCalledWith(mockPhoto.url, { responseType: 'arraybuffer' });
    });

    it('should throw error when download fails', async () => {
      const mockPhoto = {
        id: 'photo1',
        url: 'https://example.com/photo1.jpg',
        title: 'Photo 1',
        description: 'Description',
        dateTaken: '2023-01-01',
        dateUpload: '1234567890',
        tags: ['tag1'],
        width: 1920,
        height: 1080,
        secret: 'secret1',
        server: 'server1',
        farm: 1
      };

      mockedAxios.get.mockRejectedValue(new Error('Download failed'));

      await expect(flickrService.downloadPhoto(mockPhoto)).rejects.toThrow('Download failed');
    });
  });
});
