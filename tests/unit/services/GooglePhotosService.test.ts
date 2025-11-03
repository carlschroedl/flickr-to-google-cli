import { GooglePhotosService } from '../../../src/services/GooglePhotosService';
import { ApiCredentials } from '../../../src/types';

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn(),
        request: jest.fn(),
        credentials: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expiry_date: Date.now() + 3600000,
        },
      })),
    },
  },
}));

describe('GooglePhotosService', () => {
  let googlePhotosService: GooglePhotosService;
  const mockCredentials: ApiCredentials['google'] = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    refreshToken: 'test-refresh-token',
    accessToken: 'test-access-token',
    tokenExpiry: Date.now() + 3600000,
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

  describe('createAlbum', () => {
    it('should create album successfully', async () => {
      const mockAlbum = {
        id: 'album-id',
        title: 'Test Album',
        mediaItemsCount: 0,
        isWriteable: true,
      };

      const mockAuth = (googlePhotosService as any).auth;
      mockAuth.request.mockResolvedValue({
        data: mockAlbum,
      });

      const result = await googlePhotosService.createAlbum('Test Album');

      expect(result).toEqual({
        id: 'album-id',
        title: 'Test Album',
        mediaItemsCount: 0,
        coverPhotoBaseUrl: undefined,
        isWriteable: true,
      });
      expect(mockAuth.request).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://photoslibrary.googleapis.com/v1/albums',
        headers: {
          Authorization: 'Bearer test-access-token',
          'Content-Type': 'application/json',
        },
        data: {
          album: {
            title: 'Test Album',
          },
        },
      });
    });

    it('should throw error when creation fails', async () => {
      const mockAuth = (googlePhotosService as any).auth;
      mockAuth.request.mockRejectedValue(new Error('API Error'));

      await expect(googlePhotosService.createAlbum('Test Album')).rejects.toThrow('API Error');
    });
  });

  describe('getAlbums', () => {
    it('should fetch and return albums', async () => {
      const mockAlbums = [
        {
          id: 'album-1',
          title: 'Album 1',
          mediaItemsCount: 5,
          isWriteable: true,
        },
        {
          id: 'album-2',
          title: 'Album 2',
          mediaItemsCount: 3,
          isWriteable: false,
        },
      ];

      const mockAuth = (googlePhotosService as any).auth;
      mockAuth.request.mockResolvedValue({
        data: { albums: mockAlbums },
      });

      const result = await googlePhotosService.getAlbums();

      expect(result).toEqual([
        {
          id: 'album-1',
          title: 'Album 1',
          mediaItemsCount: 5,
          coverPhotoBaseUrl: undefined,
          isWriteable: true,
        },
        {
          id: 'album-2',
          title: 'Album 2',
          mediaItemsCount: 3,
          coverPhotoBaseUrl: undefined,
          isWriteable: false,
        },
      ]);
      expect(mockAuth.request).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://photoslibrary.googleapis.com/v1/albums?pageSize=50',
        headers: {
          Authorization: 'Bearer test-access-token',
          'Content-Type': 'application/json',
        },
      });
    });

    it('should return empty array when no albums', async () => {
      const mockAuth = (googlePhotosService as any).auth;
      mockAuth.request.mockResolvedValue({
        data: { albums: [] },
      });

      const result = await googlePhotosService.getAlbums();

      expect(result).toEqual([]);
    });
  });

  describe('uploadPhoto', () => {
    it('should upload photo successfully', async () => {
      const mockPhotoBuffer = Buffer.from('test image data');
      const mockAuth = (googlePhotosService as any).auth;

      // Mock the upload response
      mockAuth.request
        .mockResolvedValueOnce({ data: 'upload-token' }) // First call for upload
        .mockResolvedValueOnce({
          // Second call for batchCreate
          data: {
            newMediaItemResults: [{ mediaItem: { id: 'photo-id' } }],
          },
        });

      const result = await googlePhotosService.uploadPhoto(
        mockPhotoBuffer,
        'test.jpg',
        'test description'
      );

      expect(result).toBe('photo-id');
      expect(mockAuth.request).toHaveBeenCalledTimes(2);
      expect(mockAuth.request).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: {
            newMediaItems: [
              {
                description: 'test description',
                simpleMediaItem: {
                  uploadToken: 'upload-token',
                },
              },
            ],
          },
        })
      );
    });
    it('should throw error when upload fails', async () => {
      const mockPhotoBuffer = Buffer.from('test image data');
      const mockAuth = (googlePhotosService as any).auth;
      mockAuth.request.mockRejectedValue(new Error('Upload failed'));

      await expect(googlePhotosService.uploadPhoto(mockPhotoBuffer, 'test.jpg')).rejects.toThrow(
        'Upload failed'
      );
    });
  });

  describe('addPhotosToAlbum', () => {
    it('should add photos to album successfully', async () => {
      const mockAuth = (googlePhotosService as any).auth;
      mockAuth.request.mockResolvedValue({ data: {} });

      await googlePhotosService.addPhotosToAlbum('album-id', [
        'photo-1',
        'photo-2',
        'photo-1',
        'photo-3',
        'photo-2',
      ]);

      expect(mockAuth.request).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://photoslibrary.googleapis.com/v1/albums/album-id:batchAddMediaItems',
        headers: {
          Authorization: 'Bearer test-access-token',
          'Content-Type': 'application/json',
        },
        data: {
          mediaItemIds: ['photo-1', 'photo-2', 'photo-3'],
        },
      });
    });
  });

  describe('getAccessToken', () => {
    it('should return access token', async () => {
      const result = await googlePhotosService.getAccessToken();
      expect(result).toBe('test-access-token');
    });
  });
});
