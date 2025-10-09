import { createFlickr } from 'flickr-sdk';
import { readFileSync } from 'node:fs';
import { IncomingMessage, ServerResponse } from 'node:http';
import { createServer, ServerOptions } from 'node:https';
import { resolve } from 'node:path';
import { ApiCredentials, FlickrAlbum, FlickrOAuthTokens, FlickrPhoto } from '../types';
import { Logger } from '../utils/Logger';

export class FlickrService {
  private flickr: any;
  private apiKey: string;
  private apiSecret: string;
  private oauthTokens?: FlickrOAuthTokens;
  private server: any;
  private currentRequestToken?: string;
  private currentRequestTokenSecret?: string;

  constructor(credentials: ApiCredentials['flickr']) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.oauthTokens = credentials.oauthTokens;
    // No need to initialize Maps - using simple instance variables

    // Initialize flickr-sdk
    this.flickr = createFlickr({
      consumerKey: this.apiKey,
      consumerSecret: this.apiSecret,
      oauthToken: this.oauthTokens?.oauthToken || false,
      oauthTokenSecret: this.oauthTokens?.oauthTokenSecret || false,
    });
  }

  /**
   * Start OAuth authentication flow
   * Returns the authorization URL that the user needs to visit
   */
  async startOAuthFlow(): Promise<{
    authUrl: string;
    requestToken: string;
    requestTokenSecret: string;
  }> {
    try {
      // Create a new flickr instance for OAuth flow
      const { oauth } = createFlickr({
        consumerKey: this.apiKey,
        consumerSecret: this.apiSecret,
        oauthToken: false,
        oauthTokenSecret: false,
      });

      // Get request token
      const { requestToken, requestTokenSecret } = await oauth.request(
        'https://localhost:3000/oauth/callback'
      );

      // Get authorization URL
      const authUrl = oauth.authorizeUrl(requestToken, 'read');

      return {
        authUrl,
        requestToken,
        requestTokenSecret,
      };
    } catch (error) {
      Logger.error('Failed to start OAuth flow:', error);
      throw error;
    }
  }

  /**
   * Complete OAuth authentication flow with verifier
   */
  async completeOAuthFlow(
    requestToken: string,
    requestTokenSecret: string,
    verifier: string
  ): Promise<FlickrOAuthTokens> {
    try {
      // Create a new flickr instance for OAuth verification
      const { oauth } = createFlickr({
        consumerKey: this.apiKey,
        consumerSecret: this.apiSecret,
        oauthToken: requestToken,
        oauthTokenSecret: requestTokenSecret,
      });

      // Exchange request token for access token
      const { nsid, oauthToken, oauthTokenSecret } = await oauth.verify(verifier);

      const tokens: FlickrOAuthTokens = {
        oauthToken,
        oauthTokenSecret,
        userId: nsid,
      };

      // Update the flickr instance with new tokens
      this.flickr = createFlickr({
        consumerKey: this.apiKey,
        consumerSecret: this.apiSecret,
        oauthToken,
        oauthTokenSecret,
      });

      this.oauthTokens = tokens;
      return tokens;
    } catch (error) {
      Logger.error('Failed to complete OAuth flow:', error);
      throw error;
    }
  }

  /**
   * Check if the service is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.oauthTokens?.oauthToken && this.oauthTokens?.oauthTokenSecret);
  }

  /**
   * Get authenticated user's information
   */
  async getAuthenticatedUser(): Promise<{ id: string; username: string }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please complete OAuth flow first.');
    }

    try {
      const response = await this.flickr('flickr.test.login');
      return {
        id: response.user.id,
        username: response.user.username._content,
      };
    } catch (error) {
      Logger.error('Failed to get authenticated user:', error);
      throw error;
    }
  }

  /**
   * Get user ID (works with both authenticated and public access)
   */
  async getUserId(username?: string): Promise<string> {
    if (this.oauthTokens?.userId) {
      return this.oauthTokens.userId;
    }

    if (!username) {
      throw new Error('Username is required to get user ID');
    }

    try {
      const response = await this.flickr('flickr.people.findByUsername', { username });
      return response.user.nsid;
    } catch (error) {
      Logger.error('Failed to get user ID:', error);
      throw error;
    }
  }

  /**
   * Get user's albums (photosets)
   */
  async getAlbums(userId?: string): Promise<FlickrAlbum[]> {
    const targetUserId = userId || (await this.getUserId());

    try {
      const response = await this.flickr('flickr.photosets.getList', {
        user_id: targetUserId,
        per_page: 500,
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

  /**
   * Get detailed information about a specific album
   */
  async getAlbumDetails(albumId: string): Promise<FlickrAlbum> {
    try {
      const response = await this.flickr('flickr.photosets.getInfo', {
        photoset_id: albumId,
      });

      const photoset = response.photoset;

      // Get photos in the album
      const photosResponse = await this.flickr('flickr.photosets.getPhotos', {
        photoset_id: albumId,
        per_page: 500,
        extras: 'description,date_taken,date_upload,tags,geo,url_o,url_l,url_m,url_s,o_dims',
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
        farm: photo.farm,
      }));

      return {
        id: photoset.id,
        title: photoset.title._content,
        description: photoset.description._content,
        photoCount: parseInt(photoset.photos),
        photos,
        dateCreated: photoset.date_create,
        dateUpdated: photoset.date_update,
      };
    } catch (error) {
      Logger.error(`Failed to get album details for ${albumId}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific photo
   */
  async getPhotoInfo(photoId: string): Promise<FlickrPhoto> {
    try {
      const response = await this.flickr('flickr.photos.getInfo', {
        photo_id: photoId,
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
        farm: photo.farm,
      };
    } catch (error) {
      Logger.error(`Failed to get photo info for ${photoId}:`, error);
      throw error;
    }
  }

  /**
   * Download a photo
   */
  async downloadPhoto(photo: FlickrPhoto): Promise<Buffer> {
    try {
      const response = await fetch(photo.url);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      Logger.error(`Failed to download photo ${photo.id}:`, error);
      throw error;
    }
  }

  /**
   * Get current OAuth tokens
   */
  getOAuthTokens(): FlickrOAuthTokens | undefined {
    return this.oauthTokens;
  }

  /**
   * Set OAuth tokens (useful for restoring authentication state)
   */
  setOAuthTokens(tokens: FlickrOAuthTokens): void {
    this.oauthTokens = tokens;

    // Recreate flickr instance with new tokens
    this.flickr = createFlickr({
      consumerKey: this.apiKey,
      consumerSecret: this.apiSecret,
      oauthToken: tokens.oauthToken,
      oauthTokenSecret: tokens.oauthTokenSecret,
    });
  }

  /**
   * Start OAuth server for interactive authentication
   */
  async startOAuthServer(port: number = 3000): Promise<void> {
    try {
      const options = this.getServerOptions();

      this.server = createServer(options, (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '/', `https://localhost:${port}`);

        switch (url.pathname) {
          case '/':
            return this.handleOAuthStart(req, res);
          case '/oauth/callback':
            return this.handleOAuthCallback(req, res, url.searchParams);
          default:
            res.statusCode = 404;
            res.end();
        }
      });

      this.server.listen(port, () => {
        Logger.info(`OAuth server listening on https://localhost:${port}`);
        Logger.info('Open your browser to start the OAuth flow');
      });
    } catch (error) {
      Logger.error('Failed to start OAuth server:', error);
      throw error;
    }
  }

  /**
   * Stop the OAuth server
   */
  stopOAuthServer(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      Logger.info('OAuth server stopped');
    }
  }

  /**
   * Handle OAuth start request
   */
  private async handleOAuthStart(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const { authUrl, requestToken, requestTokenSecret } = await this.startOAuthFlow();

      // Store the request token and secret
      this.currentRequestToken = requestToken;
      this.currentRequestTokenSecret = requestTokenSecret;

      // Redirect to Flickr authorization
      res.statusCode = 302;
      res.setHeader('location', authUrl);
      res.end();
    } catch (error: any) {
      Logger.error('OAuth start failed:', error);
      res.statusCode = 400;
      res.end('OAuth start failed: ' + error.message);
    }
  }

  /**
   * Handle OAuth callback
   */
  private async handleOAuthCallback(
    req: IncomingMessage,
    res: ServerResponse,
    searchParams: URLSearchParams
  ): Promise<void> {
    const requestToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');

    if (!requestToken || !oauthVerifier) {
      res.statusCode = 400;
      res.end('Missing oauth_token or oauth_verifier');
      return;
    }

    try {
      // Get stored request token secret
      if (
        !this.currentRequestToken ||
        !this.currentRequestTokenSecret ||
        this.currentRequestToken !== requestToken
      ) {
        res.statusCode = 400;
        res.end('Invalid request token');
        return;
      }

      // Complete OAuth flow
      const tokens = await this.completeOAuthFlow(
        requestToken,
        this.currentRequestTokenSecret,
        oauthVerifier
      );

      // Clean up request tokens
      this.currentRequestToken = undefined;
      this.currentRequestTokenSecret = undefined;

      // Update service tokens
      this.setOAuthTokens(tokens);

      // Test authentication
      const user = await this.getAuthenticatedUser();

      res.end(`
        <html>
          <body>
            <h1>OAuth Success!</h1>
            <p>Authenticated as: ${user.username} (${user.id})</p>
            <p>You can now close this window and use the FlickrService.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      Logger.error('OAuth callback failed:', error);
      res.statusCode = 400;
      res.end('OAuth callback failed: ' + error.message);
    }
  }

  /**
   * Get SSL certificate options for HTTPS server
   */
  private getServerOptions(): ServerOptions {
    try {
      return {
        key: readFileSync(resolve('.', 'key.pem')),
        cert: readFileSync(resolve('.', 'cert.pem')),
      };
    } catch (error) {
      throw new Error(`
Failed to load SSL certificates. OAuth callback URLs must be HTTPS.

Generate self-signed certificates by running:
$ openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

Or use the existing certificates if they exist.
      `);
    }
  }
}
