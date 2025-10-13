import { resolve } from 'node:path';
import { FlickrService } from './FlickrService';

/**
 * Example of how to use the FlickrService with bulk export data
 */
async function example() {
  try {
    // Create FlickrService instance with bulk export data directory
    const dataDirectory = resolve('tests/integration/example');
    const flickrService = new FlickrService(dataDirectory);

    console.log('📁 Using bulk export data from:', dataDirectory);

    // Get user's albums from bulk export
    console.log('📸 Fetching albums from bulk export...');
    const albums = await flickrService.getAlbums();
    console.log(`Found ${albums.length} albums:`);

    for (const album of albums) {
      console.log(`\n📁 ${album.title} (${album.photoCount} photos)`);
      console.log(`   Description: ${album.description}`);
      console.log(`   Created: ${album.dateCreated}`);
      console.log(`   Updated: ${album.dateUpdated}`);

      // Show first few photos in each album
      const photosToShow = album.photos.slice(0, 3);
      for (const photo of photosToShow) {
        console.log(`   📷 ${photo.title} (${photo.tags.length} tags)`);
        if (photo.latitude && photo.longitude) {
          console.log(`      📍 Location: ${photo.latitude}, ${photo.longitude}`);
        }
      }

      if (album.photos.length > 3) {
        console.log(`   ... and ${album.photos.length - 3} more photos`);
      }
    }

    // Get detailed info for a specific photo
    if (albums.length > 0 && albums[0].photos.length > 0) {
      const firstPhoto = albums[0].photos[0];
      console.log(`\n🔍 Detailed info for photo "${firstPhoto.title}":`);
      console.log(`   ID: ${firstPhoto.id}`);
      console.log(`   Description: ${firstPhoto.description}`);
      console.log(`   Date taken: ${firstPhoto.dateTaken}`);
      console.log(`   Tags: ${firstPhoto.tags.join(', ')}`);
      console.log(`   File path: ${firstPhoto.url}`);
    }

    console.log('\n✅ Bulk export data loaded successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  example();
}
