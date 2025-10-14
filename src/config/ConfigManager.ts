import { input, password } from '@inquirer/prompts';
import fs from 'fs-extra';
import path from 'path';
import { ApiCredentials, Config } from '../types';
import { Logger } from '../utils/Logger';

export class ConfigManager {
  private configPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), '.flickr-to-google.json');
  }

  async loadConfig(): Promise<Config | null> {
    try {
      if (await fs.pathExists(this.configPath)) {
        const configData = await fs.readJson(this.configPath);
        return configData as Config;
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
    return null;
  }

  async saveConfig(config: Config): Promise<void> {
    try {
      await fs.writeJson(this.configPath, config, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  async setupCredentials(): Promise<void> {
    Logger.info('Setting up API credentials...\n');

    const googleClientId = await input({
      message: 'Google OAuth Client ID:',
      validate: (value: string) => value.length > 0 || 'Client ID is required',
    });

    const googleClientSecret = await password({
      message: 'Google OAuth Client Secret:',
      validate: (value: string) => value.length > 0 || 'Client Secret is required',
    });

    const config: Config = {
      credentials: {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        },
      },
      defaultBatchSize: 10,
      maxRetries: 3,
      retryDelay: 1000,
    };

    await this.saveConfig(config);
    Logger.success('Configuration saved successfully!');
    Logger.info('\nNext steps:');
    Logger.info('1. Ensure your Flickr bulk export data is in the correct directory');
    Logger.info('2. Run "flickr-to-google list-albums" to see your Flickr albums');
    Logger.info('3. Run "flickr-to-google transfer" to start transferring albums');
  }

  async getCredentials(): Promise<ApiCredentials> {
    const config = await this.loadConfig();
    if (!config) {
      throw new Error('Configuration not found. Please run "flickr-to-google setup" first.');
    }
    return config.credentials;
  }
}
