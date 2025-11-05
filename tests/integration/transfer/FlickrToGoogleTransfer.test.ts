import fs from 'fs-extra';
import { ConfigManager } from '../../../src/config/ConfigManager';
import { FlickrService } from '../../../src/services/FlickrService';
import { GooglePhotosService } from '../../../src/services/GooglePhotosService';
import { FlickrToGoogleTransfer } from '../../../src/transfer/FlickrToGoogleTransfer';
import { FlickrAlbum, TransferOptions } from '../../../src/types';

// Mock dependencies
jest.mock('../../../src/services/FlickrService');
jest.mock('../../../src/services/GooglePhotosService');
jest.mock('../../../src/config/ConfigManager');
jest.mock('fs-extra');

const MockedFlickrService = FlickrService as jest.MockedClass<typeof FlickrService>;
const MockedGooglePhotosService = GooglePhotosService as jest.MockedClass<
  typeof GooglePhotosService
>;
const MockedConfigManager = ConfigManager as jest.MockedClass<typeof ConfigManager>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('FlickrToGoogleTransfer Integration', () => {
  let transfer: FlickrToGoogleTransfer;
  let mockFlickrService: jest.Mocked<FlickrService>;
  let mockGooglePhotosService: jest.Mocked<GooglePhotosService>;
  let mockConfigManager: jest.Mocked<ConfigManager>;

  const mockAlbum: FlickrAlbum = {
    id: 'album1',
    title: 'Test Album',
    description: 'Test Description',
    photoCount: 2,
    photos: [
      {
        id: 'photo1',
        name: 'Photo 1',
        description: 'Description 1',
        url: 'https://example.com/photo1.jpg',
        filename: 'photo1.jpg',
        dateTaken: '2023-01-01',
        dateUpload: '1234567890',
        tags: ['tag1'],
        latitude: 40.7128,
        longitude: -74.006,
        width: 1920,
        height: 1080,
        secret: 'secret1',
        server: 'server1',
        farm: 1,
      },
      {
        id: 'photo2',
        name: 'Photo 2',
        description: 'Description 2',
        url: 'https://example.com/photo2.jpg',
        filename: 'photo2.jpg',
        dateTaken: '2023-01-02',
        dateUpload: '1234567891',
        tags: ['tag2'],
        width: 1920,
        height: 1080,
        secret: 'secret2',
        server: 'server2',
        farm: 1,
      },
    ],
    dateCreated: '1234567890',
    dateUpdated: '1234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances
    mockFlickrService = {
      getAlbums: jest.fn(),
      getAlbumDetails: jest.fn(),
      getPhoto: jest.fn(),
      getPhotoInfo: jest.fn(),
    } as any;

    mockGooglePhotosService = {
      createAlbum: jest.fn(),
      uploadPhoto: jest.fn(),
      addPhotosToAlbum: jest.fn(),
      updatePhotoMetadata: jest.fn(),
    } as any;

    mockConfigManager = {
      getCredentials: jest.fn(),
    } as any;

    // Mock constructor returns
    MockedFlickrService.mockImplementation(() => mockFlickrService);
    MockedGooglePhotosService.mockImplementation(() => mockGooglePhotosService);
    MockedConfigManager.mockImplementation(() => mockConfigManager);

    // Mock fs operations
    (mockedFs.ensureDir as any).mockResolvedValue(undefined);
    mockedFs.writeJson.mockResolvedValue(undefined);

    transfer = new FlickrToGoogleTransfer();
  });

  describe('initialize', () => {
    it('should initialize services with credentials', async () => {
      const mockCredentials = {
        google: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
        },
      };

      mockConfigManager.getCredentials.mockResolvedValue(mockCredentials);

      await transfer.initialize();

      expect(MockedGooglePhotosService).toHaveBeenCalledWith(mockCredentials.google);
    });
  });

  describe('listFlickrAlbums', () => {
    it('should list albums successfully', async () => {
      mockConfigManager.getCredentials.mockResolvedValue({
        google: { clientId: 'test', clientSecret: 'test' },
      });

      mockFlickrService.getAlbums.mockResolvedValue([mockAlbum]);

      const consoleSpy = jest.spyOn(console, 'log');

      await transfer.listFlickrAlbums();

      expect(mockFlickrService.getAlbums).toHaveBeenCalled();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(mockAlbum.title));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockAlbum.photoCount.toString())
      );
    });

    it('should handle errors gracefully', async () => {
      mockConfigManager.getCredentials.mockResolvedValue({
        google: { clientId: 'test', clientSecret: 'test' },
      });

      mockFlickrService.getAlbums.mockRejectedValue(new Error('Example Error'));

      await expect(transfer.listFlickrAlbums()).rejects.toThrow('Example Error');
    });
  });

  describe('transferAlbums', () => {
    beforeEach(async () => {
      mockConfigManager.getCredentials.mockResolvedValue({
        google: { clientId: 'test', clientSecret: 'test' },
      });

      await transfer.initialize();
    });

    it('should transfer specific album', async () => {
      mockFlickrService.getAlbumDetails.mockResolvedValue(mockAlbum);
      mockGooglePhotosService.createAlbum.mockResolvedValue({
        id: 'google-album-id',
        title: 'Test Album',
        mediaItemsCount: 0,
        isWriteable: true,
      });
      mockFlickrService.getPhoto.mockResolvedValue(Buffer.from('mock image data'));
      mockGooglePhotosService.uploadPhoto.mockResolvedValue('google-photo-id');
      mockGooglePhotosService.addPhotosToAlbum.mockResolvedValue(undefined);

      const options: TransferOptions = {
        albumId: 'album1',
        dryRun: false,
        batchSize: 10,
        sleepTimeBetweenBatches: 0,
      };

      await transfer.transferAlbums(options);

      expect(mockFlickrService.getAlbumDetails).toHaveBeenCalledWith('album1');
      expect(mockGooglePhotosService.createAlbum).toHaveBeenCalledWith('Test Album');
      expect(mockFlickrService.getPhoto).toHaveBeenCalledTimes(2);
      expect(mockGooglePhotosService.uploadPhoto).toHaveBeenCalledTimes(2);
      expect(mockGooglePhotosService.addPhotosToAlbum).toHaveBeenCalledWith('google-album-id', [
        'google-photo-id',
        'google-photo-id',
      ]);
    });

    it('should handle dry run mode', async () => {
      mockFlickrService.getAlbumDetails.mockResolvedValue(mockAlbum);
      mockGooglePhotosService.createAlbum.mockResolvedValue({
        id: 'google-album-id',
        title: 'Test Album',
        mediaItemsCount: 0,
        isWriteable: true,
      });

      const options: TransferOptions = {
        albumId: 'album1',
        dryRun: true,
        batchSize: 10,
        sleepTimeBetweenBatches: 0,
      };

      await transfer.transferAlbums(options);

      expect(mockFlickrService.getAlbumDetails).toHaveBeenCalledWith('album1');
      expect(mockGooglePhotosService.createAlbum).not.toHaveBeenCalled();
      expect(mockFlickrService.getPhoto).not.toHaveBeenCalled();
      expect(mockGooglePhotosService.uploadPhoto).not.toHaveBeenCalled();
    });

    it('should handle batch processing', async () => {
      const largeAlbum: FlickrAlbum = {
        ...mockAlbum,
        photos: Array.from({ length: 25 }, (_, i) => ({
          ...mockAlbum.photos[0],
          id: `photo${i + 1}`,
          title: `Photo ${i + 1}`,
        })),
      };

      mockFlickrService.getAlbumDetails.mockResolvedValue(largeAlbum);
      mockGooglePhotosService.createAlbum.mockResolvedValue({
        id: 'google-album-id',
        title: 'Test Album',
        mediaItemsCount: 0,
        isWriteable: true,
      });
      mockFlickrService.getPhoto.mockResolvedValue(Buffer.from('mock image data'));
      mockGooglePhotosService.uploadPhoto.mockResolvedValue('google-photo-id');
      mockGooglePhotosService.addPhotosToAlbum.mockResolvedValue(undefined);

      const options: TransferOptions = {
        albumId: 'album1',
        dryRun: false,
        batchSize: 10,
        sleepTimeBetweenBatches: 0,
      };

      await transfer.transferAlbums(options);

      // Should process in batches of 10
      expect(mockFlickrService.getPhoto).toHaveBeenCalledTimes(25);
      expect(mockGooglePhotosService.uploadPhoto).toHaveBeenCalledTimes(25);
    });

    it('should handle photo download failures gracefully', async () => {
      mockFlickrService.getAlbumDetails.mockResolvedValue(mockAlbum);
      mockGooglePhotosService.createAlbum.mockResolvedValue({
        id: 'google-album-id',
        title: 'Test Album',
        mediaItemsCount: 0,
        isWriteable: true,
      });

      // First photo download fails, second succeeds
      mockFlickrService.getPhoto
        .mockRejectedValueOnce(new Error('Download failed'))
        .mockResolvedValueOnce(Buffer.from('mock image data'));

      mockGooglePhotosService.uploadPhoto.mockResolvedValue('google-photo-id');
      mockGooglePhotosService.addPhotosToAlbum.mockResolvedValue(undefined);

      const options: TransferOptions = {
        albumId: 'album1',
        dryRun: false,
        batchSize: 10,
        sleepTimeBetweenBatches: 0,
      };

      await transfer.transferAlbums(options);

      // Should still process the successful photo
      expect(mockGooglePhotosService.uploadPhoto).toHaveBeenCalledTimes(1);
      expect(mockGooglePhotosService.addPhotosToAlbum).toHaveBeenCalledWith('google-album-id', [
        'google-photo-id',
      ]);
    });
  });
  describe('createGoogleDescription', () => {
    it('should create a Google Photos description by concatenating populated name and descriptions', () => {
      const flickrName = 'Photo 1';
      const flickrDescription = 'Description 1';
      const googleDescription = transfer.createGoogleDescription(flickrName, flickrDescription);
      expect(googleDescription).toBe('Photo 1 - Description 1');
    });
    it('should only use name if description is not populated', () => {
      const flickrName = 'Photo 1';
      const flickrDescription = undefined;
      const googleDescription = transfer.createGoogleDescription(flickrName, flickrDescription);
      expect(googleDescription).toBe('Photo 1');
    });
    it('should only use description if name is not populated', () => {
      const flickrName = undefined;
      const flickrDescription = 'Description 1';
      const googleDescription = transfer.createGoogleDescription(flickrName, flickrDescription);
      expect(googleDescription).toBe('Description 1');
    });
    it('should return empty string if both name and description are not populated', () => {
      const flickrName = undefined;
      const flickrDescription = undefined;
      const googleDescription = transfer.createGoogleDescription(flickrName, flickrDescription);
      expect(googleDescription).toBe('');
    });
  });
});
