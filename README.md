# Flickr to Google Photos CLI

A command-line tool for transferring photo albums from Flickr to Google Photos while preserving metadata, descriptions, and location information.

## Features

- 🖼️ Transfer entire photo albums from Flickr to Google Photos
- 📝 Preserve photo descriptions and metadata
- 📍 Maintain location information (GPS coordinates)
- 🏷️ Keep photo tags and titles
- 📊 Progress tracking and job status monitoring
- 🔄 Batch processing for large albums
- 🧪 Dry-run mode for testing
- ⚡ Resume interrupted transfers

## Prerequisites

Before using this tool, you'll need export your Flickr data and set up API access for Google Photos:

### Flickr Setup

1. [Download all your Flickr content as one or more zip files](https://www.flickrhelp.com/hc/en-us/articles/4404079675156-Downloading-content-from-Flickr#h_01K2YYSY0GQ4T8PXC8B47HQ97T)

### Google Photos API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Photos Library API
4. Create OAuth 2.0 credentials
5. Note down your Client ID and Client Secret
6. Set up OAuth consent screen if needed

## Installation

1. Clone this repository:

```bash
git clone <repository-url>
cd flickr-to-google-cli
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

4. Make the CLI globally available (optional):

```bash
npm link
```

## Configuration

Run the setup command to configure your API credentials:

```bash
npm run dev setup
```

This will prompt you for:

- Google OAuth Client ID
- Google OAuth Client Secret

Your credentials will be stored in `.flickr-to-google.json` in your project directory.

## Usage

### List Flickr Albums

View all your Flickr albums:

```bash
npm run dev list-albums
```

Or for a specific user:

```bash
npm run dev list-albums --user <username>
```

### Transfer Albums

Transfer all albums:

```bash
npm run dev transfer
```

Transfer a specific album:

```bash
npm run dev transfer --album <album-id>
```

Transfer with custom options:

```bash
npm run dev transfer --album <album-id> --batch-size 5 --dry-run
```

### Check Transfer Status

View all transfer jobs:

```bash
npm run dev status
```

Check a specific job:

```bash
npm run dev status --job-id <job-id>
```

## Command Options

### `transfer` command options:

- `--album <albumId>`: Transfer a specific album by ID
- `--user <username>`: Flickr username (if different from configured)
- `--dry-run`: Preview what would be transferred without actually transferring
- `--batch-size <size>`: Number of photos to process in each batch (default: 10)

### `list-albums` command options:

- `--user <username>`: Flickr username to list albums for

### `status` command options:

- `--job-id <jobId>`: Check status of a specific transfer job

## How It Works

1. **Authentication**: The tool uses your API credentials to authenticate Google Photos
2. **Album Discovery**: Reads your Flickr albums and their metadata
3. **Upload to Google Photos**: Uploads photos to Google Photos with preserved metadata
4. **Album Creation**: Creates corresponding albums in Google Photos
5. **Progress Tracking**: Monitors transfer progress and saves job status

## What Is Transferred?

| Flickr Data       | Will Transfer Automatically | Note                                                                                                                                                            |
| ----------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Album Name        | ✅                          |                                                                                                                                                                 |
| Album Description | ❌                          | Not Supported by Google Photos                                                                                                                                  |
| Photo Name        | ✅                          | Combined with Flickr photo description and stored in Google Photo description                                                                                   |
| Photo Description | ✅                          | Combined with Flickr photo name and stored in Google Photo description                                                                                          |
| Date Photo Taken  | ✅                          | Uses EXIF data on photo file                                                                                                                                    |
| Location          | ❌                          | Google Photos only supports adding this manually through the web interface. It cannot be added with an automated tool because Google's API does not support it. |

## No Exact Duplicate Photos

Flickr allows the same photo to be uploaded multiple times. It treats them as different photos. This enables the same photo to occur in an album multiple times in Flickr.

If you upload the exact same photo to Google Photos multiple times, it only creates one photo, even if the file name is different. Google Photos only allows a photo to occur once per album. Accordingly, if you want the same photo to appear multiple times in the same album in Google Photos, you must implement a workaround -- make the repeated image non-identical by making a trivial change to the file. For example, you could slightly crop the image or resave the image with slightly different quality.

## Error Handling

- **Retry Logic**: Automatic retry for failed photo uploads
- **Progress Tracking**: Jobs are saved and can be resumed
- **Error Logging**: Detailed error messages for troubleshooting
- **Batch Processing**: Failed photos don't stop the entire transfer

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your API credentials are correct
   - Ensure OAuth consent screen is properly configured for Google Photos
   - Check that the Google Photos Library API is enabled

2. **Rate Limiting**
   - The tool includes built-in rate limiting
   - Reduce batch size if you encounter rate limit errors
   - Use `--batch-size` option to control processing speed

3. **Large Albums**
   - Use smaller batch sizes for very large albums
   - Monitor progress with the `status` command
   - Consider using `--dry-run` first to estimate transfer time

### Debug Mode

Enable debug logging:

```bash
DEBUG=1 npm run dev transfer
```

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev <command>
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check

# Run all checks (lint + format + build + test)
npm run check
```

### Cleaning

```bash
npm run clean
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run check` to ensure code quality (linting, formatting, and build)
5. Add tests if applicable
6. Submit a pull request

### Code Quality

This project uses ESLint and Prettier for code quality and formatting:

- **ESLint**: Catches potential bugs and enforces coding standards
- **Prettier**: Ensures consistent code formatting
- **TypeScript**: Provides type safety and better IDE support

### Testing

The project includes comprehensive automated testing:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions and CLI functionality
- **Coverage Reports**: Track test coverage with detailed reports
- **Mocking**: Proper mocking of external dependencies

Test Structure:

```
tests/
├── unit/                    # Unit tests
│   ├── config/             # ConfigManager tests
│   ├── services/           # API service tests
│   └── utils/              # Utility tests
├── integration/            # Integration tests
│   ├── cli/                # CLI command tests
│   └── transfer/           # Transfer logic tests
└── setup.ts               # Test configuration
```

Before submitting a pull request, make sure to run:

```bash
npm run check
```

This will run linting, format checking, build verification, and all tests.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review the error logs with debug mode enabled
3. Open an issue on GitHub with detailed error information

## Security Notes

- API credentials are stored locally in `.flickr-to-google.json`
- Never commit this file to version control
- The file is included in `.gitignore` for your protection
- Consider using environment variables for production deployments

## Dependency Management

This project uses GitHub Dependabot for automated dependency updates:

- **Daily Updates**: Dependabot runs daily
- **Auto-merge**: Minor and patch updates for production dependencies (i.e., version 1.0.0 or greater) are automatically merged after passing tests.
