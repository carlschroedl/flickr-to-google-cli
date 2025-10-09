import { ConfigManager } from '../config/ConfigManager';
import { FlickrService } from './FlickrService';

/**
 * Wait for authentication to complete by polling the service
 */
async function waitForAuthentication(flickrService: FlickrService): Promise<void> {
  console.log('⏳ Waiting for authentication...');

  // Poll every 2 seconds until authenticated
  while (!flickrService.isAuthenticated()) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('✅ Authentication detected!');
}

/**
 * Example of how to use the FlickrService with OAuth server
 */
async function example() {
  try {
    // Load credentials from config
    const configManager = new ConfigManager();
    const credentials = await configManager.getCredentials();
    const flickrService = new FlickrService(credentials.flickr);

    // Check if already authenticated
    if (flickrService.isAuthenticated()) {
      console.log('Already authenticated!');
      const user = await flickrService.getAuthenticatedUser();
      console.log(`Authenticated as: ${user.username} (${user.id})`);

      // Get user's albums
      const albums = await flickrService.getAlbums();
      console.log(`Found ${albums.length} albums`);

      return;
    }

    // Start OAuth server for interactive authentication
    console.log('Starting OAuth server...');
    await flickrService.startOAuthServer(3000);

    console.log('Open your browser to: https://localhost:3000');
    console.log('After authentication, the server will automatically stop and show your albums.');

    // Wait for authentication to complete
    await waitForAuthentication(flickrService);

    // Once authenticated, get user info and albums
    const user = await flickrService.getAuthenticatedUser();
    console.log(`\n✅ Successfully authenticated as: ${user.username} (${user.id})`);

    // Get user's albums
    console.log('📸 Fetching your photo albums...');
    const albums = await flickrService.getAlbums();
    console.log(`Found ${albums.length} albums:`);

    albums.forEach((album, index) => {
      console.log(`  ${index + 1}. ${album.title} (${album.photoCount} photos)`);
    });

    // Stop the server after successful completion
    console.log('\n🎉 OAuth flow completed successfully!');
    flickrService.stopOAuthServer();
    console.log('Server stopped.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  example();
}
