import fs from 'fs-extra';
import path from 'path';
import { input, password } from '@inquirer/prompts';
import { Config, ApiCredentials } from '../types';

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
    console.log('Setting up API credentials...\n');

    const flickrApiKey = await input({
      message: 'Flickr API Key:',
      validate: (value: string) => value.length > 0 || 'API Key is required'
    });

    const flickrApiSecret = await password({
      message: 'Flickr API Secret:',
      validate: (value: string) => value.length > 0 || 'API Secret is required'
    });

    const flickrUserId = await input({
      message: 'Flickr User ID (optional, can be found in your Flickr profile URL):',
    });

    const googleClientId = await input({
      message: 'Google OAuth Client ID:',
      validate: (value: string) => value.length > 0 || 'Client ID is required'
    });

    const googleClientSecret = await password({
      message: 'Google OAuth Client Secret:',
      validate: (value: string) => value.length > 0 || 'Client Secret is required'
    });

    const config: Config = {
      credentials: {
        flickr: {
          apiKey: flickrApiKey,
          apiSecret: flickrApiSecret,
          userId: flickrUserId || undefined
        },
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret
        }
      },
      defaultBatchSize: 10,
      maxRetries: 3,
      retryDelay: 1000
    };

    await this.saveConfig(config);
    console.log('\n✓ Configuration saved successfully!');
    console.log('\nNext steps:');
    console.log('1. Run "flickr-to-google list-albums" to see your Flickr albums');
    console.log('2. Run "flickr-to-google transfer" to start transferring albums');
  }

  async getCredentials(): Promise<ApiCredentials> {
    const config = await this.loadConfig();
    if (!config) {
      throw new Error('Configuration not found. Please run "flickr-to-google setup" first.');
    }
    return config.credentials;
  }
}
