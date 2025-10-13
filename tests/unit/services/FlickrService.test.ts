import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FlickrService } from '../../../src/services/FlickrService';

// Mock file system operations
jest.mock('node:fs');
jest.mock('node:path');
const mockedExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockedReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockedJoin = join as jest.MockedFunction<typeof join>;

describe('FlickrService', () => {
  let flickrService: FlickrService;
  const mockDataDirectory = '/test/data/directory';

  beforeEach(() => {
    jest.clearAllMocks();
    flickrService = new FlickrService(mockDataDirectory);
  });

  describe('constructor', () => {
    it('should initialize with data directory', () => {
      expect(flickrService).toBeInstanceOf(FlickrService);
    });
  });

  describe('getAlbums', () => {
    it('should read albums from local metadata file', async () => {
      const mockAlbumsData = {
        albums: [
          {
            id: 'album1',
            title: 'Album 1',
            description: 'Description 1',
            photo_count: '2',
            created: '1234567890',
            last_updated: '1234567890',
            photos: ['photo1', 'photo2'],
          },
        ],
      };

      mockedJoin.mockReturnValue('/test/data/directory/metadata/albums.json');
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockAlbumsData));

      // Mock getAlbumDetails to return a simplified album
      jest.spyOn(flickrService, 'getAlbumDetails').mockResolvedValue({
        id: 'album1',
        title: 'Album 1',
        description: 'Description 1',
        photoCount: 2,
        photos: [],
        dateCreated: '1970-01-15T06:56:07.890Z',
        dateUpdated: '1970-01-15T06:56:07.890Z',
      });

      const albums = await flickrService.getAlbums();

      expect(albums).toHaveLength(1);
      expect(albums[0].id).toBe('album1');
      expect(albums[0].title).toBe('Album 1');
      expect(mockedJoin).toHaveBeenCalledWith(mockDataDirectory, 'metadata', 'albums.json');
      expect(mockedReadFileSync).toHaveBeenCalledWith(
        '/test/data/directory/metadata/albums.json',
        'utf-8'
      );
    });

    it('should throw error when albums metadata file not found', async () => {
      mockedJoin.mockReturnValue('/test/data/directory/metadata/albums.json');
      mockedExistsSync.mockReturnValue(false);

      await expect(flickrService.getAlbums()).rejects.toThrow(
        'Albums metadata file not found: /test/data/directory/metadata/albums.json'
      );
    });
  });

  describe('getAlbumDetails', () => {
    it('should read album details from local metadata file', async () => {
      const mockAlbumsData = {
        albums: [
          {
            id: 'album1',
            title: 'Album 1',
            description: 'Description 1',
            photo_count: '1',
            created: '1234567890',
            last_updated: '1234567890',
            photos: ['photo1'],
          },
        ],
      };

      const mockPhotoData = {
        id: 'photo1',
        name: 'Photo 1',
        description: 'Photo description',
        date_taken: '2023-01-01',
        date_imported: '1234567890',
        tags: [{ tag: 'tag1' }, { tag: 'tag2' }],
        geo: [{ latitude: '40.7128', longitude: '-74.0060' }],
      };

      mockedJoin
        .mockReturnValueOnce('/test/data/directory/metadata/albums.json')
        .mockReturnValueOnce('/test/data/directory/metadata/photo_photo1.json');

      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync
        .mockReturnValueOnce(JSON.stringify(mockAlbumsData))
        .mockReturnValueOnce(JSON.stringify(mockPhotoData));

      // Mock getDataFiles to return a photo file
      jest.spyOn(flickrService as any, 'getDataFiles').mockReturnValue(['black_2_o_photo1_o.jpg']);

      const album = await flickrService.getAlbumDetails('album1');

      expect(album.id).toBe('album1');
      expect(album.title).toBe('Album 1');
      expect(album.description).toBe('Description 1');
      expect(album.photoCount).toBe(1);
      expect(album.photos).toHaveLength(1);
      expect(album.photos[0].id).toBe('photo1');
      expect(album.photos[0].title).toBe('Photo 1');
    });

    it('should throw error when album not found', async () => {
      const mockAlbumsData = {
        albums: [
          {
            id: 'album2',
            title: 'Album 2',
            description: 'Description 2',
            photo_count: '1',
            created: '1234567890',
            last_updated: '1234567890',
            photos: ['photo1'],
          },
        ],
      };

      mockedJoin.mockReturnValue('/test/data/directory/metadata/albums.json');
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockAlbumsData));

      await expect(flickrService.getAlbumDetails('album1')).rejects.toThrow(
        'Album album1 not found'
      );
    });
  });

  describe('getPhoto', () => {
    it('should read photo from local file path', async () => {
      const mockPhoto = {
        id: 'photo1',
        url: '/test/data/directory/data/black_2_o_photo1_o.jpg',
        title: 'Photo 1',
        description: 'Description',
        dateTaken: '2023-01-01',
        dateUpload: '1234567890',
        tags: ['tag1'],
        latitude: 40.7128,
        longitude: -74.006,
        width: 0,
        height: 0,
        secret: '',
        server: '',
        farm: 0,
      };

      const mockBuffer = Buffer.from('mock image data');
      mockedReadFileSync.mockReturnValue(mockBuffer);

      const result = await flickrService.getPhoto(mockPhoto);

      expect(result).toEqual(mockBuffer);
      expect(mockedReadFileSync).toHaveBeenCalledWith(mockPhoto.url);
    });

    it('should find photo file in data directory when URL is not a local path', async () => {
      const mockPhoto = {
        id: 'photo1',
        url: 'https://example.com/photo1.jpg',
        title: 'Photo 1',
        description: 'Description',
        dateTaken: '2023-01-01',
        dateUpload: '1234567890',
        tags: ['tag1'],
        latitude: 40.7128,
        longitude: -74.006,
        width: 0,
        height: 0,
        secret: '',
        server: '',
        farm: 0,
      };

      const mockBuffer = Buffer.from('mock image data');

      // Mock getDataFiles to return a matching file
      jest.spyOn(flickrService as any, 'getDataFiles').mockReturnValue(['black_2_o_photo1_o.jpg']);
      mockedJoin.mockReturnValue('/test/data/directory/data/black_2_o_photo1_o.jpg');
      mockedReadFileSync.mockReturnValue(mockBuffer);

      const result = await flickrService.getPhoto(mockPhoto);

      expect(result).toEqual(mockBuffer);
      expect(mockedJoin).toHaveBeenCalledWith(mockDataDirectory, 'data', 'black_2_o_photo1_o.jpg');
    });

    it('should throw error when photo file not found', async () => {
      const mockPhoto = {
        id: 'photo1',
        url: 'https://example.com/photo1.jpg',
        title: 'Photo 1',
        description: 'Description',
        dateTaken: '2023-01-01',
        dateUpload: '1234567890',
        tags: ['tag1'],
        latitude: 40.7128,
        longitude: -74.006,
        width: 0,
        height: 0,
        secret: '',
        server: '',
        farm: 0,
      };

      // Mock getDataFiles to return no matching files
      jest.spyOn(flickrService as any, 'getDataFiles').mockReturnValue([]);

      await expect(flickrService.getPhoto(mockPhoto)).rejects.toThrow(
        'Photo file not found for photo photo1'
      );
    });
  });

  describe('getPhotoInfo', () => {
    it('should read photo info from local metadata file', async () => {
      const mockPhotoData = {
        id: 'photo1',
        name: 'Photo 1',
        description: 'Photo description',
        date_taken: '2023-01-01',
        date_imported: '1234567890',
        tags: [{ tag: 'tag1' }, { tag: 'tag2' }],
        geo: [{ latitude: '40.7128', longitude: '-74.0060' }],
      };

      mockedJoin.mockReturnValue('/test/data/directory/metadata/photo_photo1.json');
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(JSON.stringify(mockPhotoData));

      // Mock getDataFiles to return a matching file
      jest.spyOn(flickrService as any, 'getDataFiles').mockReturnValue(['black_2_o_photo1_o.jpg']);

      const photo = await flickrService.getPhotoInfo('photo1');

      expect(photo.id).toBe('photo1');
      expect(photo.title).toBe('Photo 1');
      expect(photo.description).toBe('Photo description');
      expect(photo.tags).toEqual(['tag1', 'tag2']);
      expect(photo.latitude).toBe(40.7128);
      expect(photo.longitude).toBe(-74.006);
      expect(mockedJoin).toHaveBeenCalledWith(mockDataDirectory, 'metadata', 'photo_photo1.json');
    });

    it('should throw error when photo metadata file not found', async () => {
      mockedJoin.mockReturnValue('/test/data/directory/metadata/photo_photo1.json');
      mockedExistsSync.mockReturnValue(false);

      await expect(flickrService.getPhotoInfo('photo1')).rejects.toThrow(
        'Photo metadata file not found: /test/data/directory/metadata/photo_photo1.json'
      );
    });
  });
});
