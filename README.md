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

Before using this tool, you'll need to set up API access for both Flickr and Google Photos:

### Flickr API Setup

1. Go to [Flickr API](https://www.flickr.com/services/api/)
2. Create a new application
3. Note down your API Key and API Secret
4. Optionally, find your Flickr User ID (found in your profile URL)

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
- Flickr API Key
- Flickr API Secret
- Flickr User ID (optional)
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

1. **Authentication**: The tool uses your API credentials to authenticate with both Flickr and Google Photos
2. **Album Discovery**: Fetches your Flickr albums and their metadata
3. **Photo Processing**: Downloads photos from Flickr in batches
4. **Upload to Google Photos**: Uploads photos to Google Photos with preserved metadata
5. **Album Creation**: Creates corresponding albums in Google Photos
6. **Progress Tracking**: Monitors transfer progress and saves job status

## Metadata Preservation

The tool preserves the following metadata during transfer:

- Photo titles and descriptions
- GPS location information (latitude/longitude)
- Photo dimensions and technical details
- Album titles and descriptions
- Creation and upload dates

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
