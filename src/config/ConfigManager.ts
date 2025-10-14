import { input, password } from '@inquirer/prompts';
import fs from 'fs-extra';
import { google } from 'googleapis';
import { getAuthCode } from 'oauth-callback';
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
    Logger.info('1. Run "flickr-to-google authenticate" to complete OAuth setup');
    Logger.info('2. Ensure your Flickr bulk export data is in the correct directory');
    Logger.info('3. Run "flickr-to-google list-albums" to see your Flickr albums');
    Logger.info('4. Run "flickr-to-google transfer" to start transferring albums');
  }

  async authenticate(): Promise<void> {
    const config = await this.loadConfig();
    if (!config) {
      throw new Error('Configuration not found. Please run "flickr-to-google setup" first.');
    }

    const { clientId, clientSecret } = config.credentials.google;
    if (!clientId || !clientSecret) {
      throw new Error('Google credentials not found. Please run "flickr-to-google setup" first.');
    }

    Logger.info('Starting OAuth authentication...\n');
    Logger.info('This will open your browser to authorize the application.\n');

    try {
      // Set up OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'http://localhost:3000/oauth2callback' // This will be handled by oauth-callback
      );

      // Generate the URL for OAuth consent
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/photoslibrary',
          'https://www.googleapis.com/auth/photoslibrary.appendonly',
          'https://www.googleapis.com/auth/photoslibrary.readonly',
        ],
        prompt: 'consent', // Force consent to get refresh token
      });

      Logger.info('Opening browser for authentication...');

      // Use oauth-callback to handle the OAuth flow
      const { code } = await getAuthCode({
        authorizationUrl: authUrl,
        port: 3000,
        timeout: 300000, // 5 minutes timeout
      });

      Logger.info('Authorization code received, exchanging for tokens...');

      // Exchange authorization code for tokens
      if (!code) {
        throw new Error('No authorization code received');
      }

      const tokenResponse = await oauth2Client.getToken(code);
      const tokens = tokenResponse.tokens;

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to obtain required tokens from Google');
      }

      // Save tokens to config
      const tokenExpiry = tokens.expiry_date ? tokens.expiry_date : Date.now() + 3600 * 1000;

      config.credentials.google.accessToken = tokens.access_token;
      config.credentials.google.refreshToken = tokens.refresh_token;
      config.credentials.google.tokenExpiry = tokenExpiry;

      await this.saveConfig(config);

      Logger.success('Authentication completed successfully!');
      Logger.info('\nYou can now use the transfer commands.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('Authentication timed out. Please try again.');
      }
      throw error;
    }
  }

  async saveTokens(accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
    const config = await this.loadConfig();
    if (!config) {
      throw new Error('Configuration not found. Please run "flickr-to-google setup" first.');
    }

    const tokenExpiry = Date.now() + expiresIn * 1000;

    config.credentials.google.accessToken = accessToken;
    config.credentials.google.refreshToken = refreshToken;
    config.credentials.google.tokenExpiry = tokenExpiry;

    await this.saveConfig(config);
    Logger.success('Authentication tokens saved successfully!');
  }

  async getCredentials(): Promise<ApiCredentials> {
    const config = await this.loadConfig();
    if (!config) {
      throw new Error('Configuration not found. Please run "flickr-to-google setup" first.');
    }
    return config.credentials;
  }
}
