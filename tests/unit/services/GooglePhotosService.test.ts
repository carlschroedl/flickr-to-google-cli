import { GooglePhotosService } from '../../../src/services/GooglePhotosService';
import { ApiCredentials } from '../../../src/types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GooglePhotosService', () => {
  let googlePhotosService: GooglePhotosService;
  const mockCredentials: ApiCredentials['google'] = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    refreshToken: 'test-refresh-token'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    googlePhotosService = new GooglePhotosService(mockCredentials);
  });

  describe('constructor', () => {
    it('should initialize with credentials', () => {
      expect(googlePhotosService).toBeInstanceOf(GooglePhotosService);
    });
  });

  describe('getAccessToken', () => {
    it('should return cached access token when available', async () => {
      // Set a cached token
      (googlePhotosService as any).accessToken = 'cached-token';
      
      const result = await (googlePhotosService as any).getAccessToken();
      
      expect(result).toBe('cached-token');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should fetch new access token when not cached', async () => {
      const mockResponse = {
        data: {
          access_token: 'new-access-token'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await (googlePhotosService as any).getAccessToken();

      expect(result).toBe('new-access-token');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          refresh_token: 'test-refresh-token',
          grant_type: 'refresh_token'
        }
      );
    });

    it('should throw error when no refresh token available', async () => {
      const serviceWithoutRefreshToken = new GooglePhotosService({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret'
      });

      await expect((serviceWithoutRefreshToken as any).getAccessToken()).rejects.toThrow(
        'No refresh token available. Please re-authenticate.'
      );
    });
  });

  describe('createAlbum', () => {
    it('should create album successfully', async () => {
      const mockResponse = {
        data: {
          id: 'album-id',
          title: 'Test Album',
          description: 'Test Description'
        }
      };

      (mockedAxios as any).mockResolvedValue(mockResponse);

      const result = await googlePhotosService.createAlbum('Test Album', 'Test Description');

      expect(result).toEqual({
        id: 'album-id',
        title: 'Test Album',
        description: 'Test Description',
        mediaItemsCount: 0,
        isWriteable: true
      });
    });

    it('should throw error when creation fails', async () => {
      (mockedAxios as any).mockRejectedValue(new Error('Creation failed'));

      await expect(googlePhotosService.createAlbum('Test Album')).rejects.toThrow('Creation failed');
    });
  });

  describe('getAlbums', () => {
    it('should fetch and return albums', async () => {
      const mockResponse = {
        data: {
          albums: [
            {
              id: 'album1',
              title: 'Album 1',
              description: 'Description 1',
              mediaItemsCount: 5,
              isWriteable: true
            }
          ]
        }
      };

      (mockedAxios as any).mockResolvedValue(mockResponse);

      const albums = await googlePhotosService.getAlbums();

      expect(albums).toHaveLength(1);
      expect(albums[0].id).toBe('album1');
      expect(albums[0].title).toBe('Album 1');
    });

    it('should return empty array when no albums', async () => {
      const mockResponse = {
        data: {}
      };

      (mockedAxios as any).mockResolvedValue(mockResponse);

      const albums = await googlePhotosService.getAlbums();

      expect(albums).toEqual([]);
    });
  });

  describe('uploadPhoto', () => {
    it('should upload photo successfully', async () => {
      const mockUploadToken = 'upload-token';
      const mockPhotoId = 'photo-id';
      const mockBuffer = Buffer.from('mock image data');

      // Mock uploadBinary
      jest.spyOn(googlePhotosService as any, 'uploadBinary').mockResolvedValue(mockUploadToken);

      const mockResponse = {
        data: {
          newMediaItemResults: [
            {
              mediaItem: {
                id: mockPhotoId
              }
            }
          ]
        }
      };

      (mockedAxios as any).mockResolvedValue(mockResponse);

      const result = await googlePhotosService.uploadPhoto(mockBuffer, 'test.jpg', 'image/jpeg');

      expect(result).toBe(mockPhotoId);
    });

    it('should throw error when upload fails', async () => {
      const mockBuffer = Buffer.from('mock image data');

      jest.spyOn(googlePhotosService as any, 'uploadBinary').mockRejectedValue(new Error('Upload failed'));

      await expect(googlePhotosService.uploadPhoto(mockBuffer, 'test.jpg', 'image/jpeg')).rejects.toThrow('Upload failed');
    });
  });

  describe('addPhotosToAlbum', () => {
    it('should add photos to album successfully', async () => {
      const mockResponse = {
        data: {}
      };

      (mockedAxios as any).mockResolvedValue(mockResponse);

      await googlePhotosService.addPhotosToAlbum('album-id', ['photo1', 'photo2']);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://photoslibrary.googleapis.com/v1/albums/album-id:batchAddMediaItems',
          data: {
            mediaItemIds: ['photo1', 'photo2']
          }
        })
      );
    });
  });

  describe('updatePhotoMetadata', () => {
    it('should update photo description', async () => {
      const mockResponse = {
        data: {}
      };

      (mockedAxios as any).mockResolvedValue(mockResponse);

      await googlePhotosService.updatePhotoMetadata('photo-id', 'New description');

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: 'https://photoslibrary.googleapis.com/v1/mediaItems/photo-id',
          data: {
            description: 'New description'
          }
        })
      );
    });

    it('should update photo location', async () => {
      const mockResponse = {
        data: {}
      };

      (mockedAxios as any).mockResolvedValue(mockResponse);

      await googlePhotosService.updatePhotoMetadata('photo-id', undefined, {
        latitude: 40.7128,
        longitude: -74.0060
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: 'https://photoslibrary.googleapis.com/v1/mediaItems/photo-id',
          data: {
            location: {
              latlng: {
                latitude: 40.7128,
                longitude: -74.0060
              }
            }
          }
        })
      );
    });
  });
});
