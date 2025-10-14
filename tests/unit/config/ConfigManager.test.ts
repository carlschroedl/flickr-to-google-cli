import fs from 'fs-extra';
import path from 'path';
import { ConfigManager } from '../../../src/config/ConfigManager';
import { Config } from '../../../src/types';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock @inquirer/prompts
jest.mock('@inquirer/prompts', () => ({
  input: jest.fn(),
  password: jest.fn(),
}));

import { input, password } from '@inquirer/prompts';
const mockedInput = input as jest.MockedFunction<typeof input>;
const mockedPassword = password as jest.MockedFunction<typeof password>;

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const mockConfigPath = '/mock/path/.flickr-to-google.json';

  beforeEach(() => {
    jest.clearAllMocks();
    configManager = new ConfigManager();

    // Mock path.join to return our mock path
    jest.spyOn(path, 'join').mockReturnValue(mockConfigPath);
  });

  describe('loadConfig', () => {
    it('should return null when config file does not exist', async () => {
      (mockedFs.pathExists as any).mockResolvedValue(false);

      const result = await configManager.loadConfig();

      expect(result).toBeNull();
      expect(mockedFs.readJson).not.toHaveBeenCalled();
    });

    it('should return config when file exists', async () => {
      const mockConfig: Config = {
        credentials: {
          google: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
          },
        },
        defaultBatchSize: 10,
        maxRetries: 3,
        retryDelay: 1000,
      };

      (mockedFs.pathExists as any).mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(mockConfig);

      const result = await configManager.loadConfig();

      expect(result).toEqual(mockConfig);
      expect(mockedFs.readJson).toHaveBeenCalledWith(mockConfigPath);
    });

    it('should return null when file exists but read fails', async () => {
      (mockedFs.pathExists as any).mockResolvedValue(true);
      mockedFs.readJson.mockRejectedValue(new Error('Read error'));

      const result = await configManager.loadConfig();

      expect(result).toBeNull();
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', async () => {
      const mockConfig: Config = {
        credentials: {
          google: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
          },
        },
        defaultBatchSize: 10,
        maxRetries: 3,
        retryDelay: 1000,
      };

      mockedFs.writeJson.mockResolvedValue(undefined);

      await configManager.saveConfig(mockConfig);

      expect(mockedFs.writeJson).toHaveBeenCalledWith(mockConfigPath, mockConfig, { spaces: 2 });
    });

    it('should throw error when save fails', async () => {
      const mockConfig: Config = {
        credentials: {
          google: { clientId: 'test', clientSecret: 'test' },
        },
        defaultBatchSize: 10,
        maxRetries: 3,
        retryDelay: 1000,
      };

      mockedFs.writeJson.mockRejectedValue(new Error('Write error'));

      await expect(configManager.saveConfig(mockConfig)).rejects.toThrow(
        'Failed to save config: Error: Write error'
      );
    });
  });

  describe('setupCredentials', () => {
    it('should prompt for credentials and save config', async () => {
      mockedInput.mockResolvedValueOnce('test-client-id');
      mockedPassword.mockResolvedValueOnce('test-client-secret');

      mockedFs.writeJson.mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'log');

      await configManager.setupCredentials();

      expect(mockedInput).toHaveBeenCalledTimes(1);
      expect(mockedPassword).toHaveBeenCalledTimes(1);
      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        mockConfigPath,
        expect.objectContaining({
          credentials: {
            google: {
              clientId: 'test-client-id',
              clientSecret: 'test-client-secret',
            },
          },
        }),
        { spaces: 2 }
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        'Configuration saved successfully!'
      );
    });
  });

  describe('getCredentials', () => {
    it('should return credentials when config exists', async () => {
      const mockConfig: Config = {
        credentials: {
          google: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
          },
        },
        defaultBatchSize: 10,
        maxRetries: 3,
        retryDelay: 1000,
      };

      (mockedFs.pathExists as any).mockResolvedValue(true);
      mockedFs.readJson.mockResolvedValue(mockConfig);

      const result = await configManager.getCredentials();

      expect(result).toEqual(mockConfig.credentials);
    });

    it('should throw error when config does not exist', async () => {
      (mockedFs.pathExists as any).mockResolvedValue(false);

      await expect(configManager.getCredentials()).rejects.toThrow(
        'Configuration not found. Please run "flickr-to-google setup" first.'
      );
    });
  });
});
