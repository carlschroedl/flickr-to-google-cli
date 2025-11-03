# Flickr to Google Photos CLI

## Unmaintained, Unsupported

This is a proof-of-concept command-line tool for transferring photo albums from Flickr to Google Photos while preserving some metadata. It is not maintained or supported.

## Features

- 🖼️ Transfer entire photo albums from Flickr to Google Photos
- 📝 Preserve photo descriptions and some metadata
- 📊 Progress tracking and job status monitoring
- 🔄 Batch processing for large albums
- 🧪 Dry-run mode for testing

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
7. If using a test user, add their email to the OAuth consent screen

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
flickr-to-google setup
```

This will prompt you for:

- Google OAuth Client ID
- Google OAuth Client Secret

Your credentials will be stored in `.flickr-to-google.json` in your project directory.

Next authenticate with Google Photos by running the following command.

```bash
flickr-to-google authenticate
```

## Usage

### List Flickr Albums

View all your Flickr albums:

```bash
flickr-to-google list-albums
```

By default, the tool looks for your Flickr export in the `flickr-export`. To specify a different location, use the `--data-dir` option.

```bash
flickr-to-google list-albums --data-dir myGreatFolder
```

### Transfer Albums

Transfer all albums:

```bash
flickr-to-google transfer
```

Transfer a specific album:

```bash
flickr-to-google transfer --album <album-id>
```

Transfer with custom options:

```bash
flickr-to-google transfer --album <album-id> --batch-size 5 --dry-run
```

## What Is Transferred?

| Flickr Data       | Will Transfer Automatically | Note                                                                                                                                                            |
| ----------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Album Name        | ✅                          |                                                                                                                                                                 |
| Album Description | ❌                          | Not Supported by Google Photos                                                                                                                                  |
| Photo Name        | ✅                          | Combined with Flickr photo description and stored in Google Photo description                                                                                   |
| Photo Description | ✅                          | Combined with Flickr photo name and stored in Google Photo description                                                                                          |
| Date Photo Taken  | ✅                          | Only if present on EXIF metadata on original photo file                                                                                                         |
| Location          | ❌                          | Google Photos only supports adding this manually through the web interface. It cannot be added with an automated tool because Google's API does not support it. |
| Date Uploaded     | ❌                          | This would require reading and writing EXIF metadata, which is out of scope for this project                                                                    |
| Album Cover Photo | ❌                          | Not currently implemented                                                                                                                                       |

## No Exact Duplicate Photos

Flickr allows the same photo to be uploaded multiple times. It treats them as different photos. This enables the same image to occur in an album multiple times in Flickr.

If you upload the exact same photo to Google Photos multiple times, it only creates one photo, even if the file name is different. Google Photos only allows a photo to occur once per album. Accordingly, if you want the same photo to appear multiple times in the same album in Google Photos, you must implement a workaround -- make the repeated image non-identical by making a trivial change to the file. For example, you could slightly crop the image or resave the image with slightly different quality.

## Error Handling

- **Error Logging**: Detailed error messages for troubleshooting
- **Batch Processing**: Failed photos don't stop the entire transfer

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your API credentials are correct
   - Ensure OAuth consent screen is properly configured for Google Photos
   - Check that the Google Photos Library API is enabled

2. **Rate Limiting**
   - The tool includes built-in delays to avoid exceeding Google Photos API rate limiting
   - If you encounter rate limit errors, specify different values for `--sleep-time-between-batches` or `--batch-size`

### Debug Mode

Enable debug logging:

```bash
DEBUG=1 flickr-to-google transfer
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

Common testing commands folow. See `package.json` for full list.

```bash
# Run all checks (lint + format + build + test)
npm run check
```

```bash
# Run all tests
npm test
```

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

## License

MIT License - see LICENSE file for details

## Security Notes

- API credentials are stored locally in `.flickr-to-google.json`
- Never commit this file to version control
- The file is included in `.gitignore` for your protection

## Dependency Management

This project uses GitHub Dependabot for automated dependency updates:

- **Daily Updates**: Dependabot runs daily
- **Auto-merge**: Minor and patch updates for production dependencies (i.e., version 1.0.0 or greater) are automatically merged after passing tests.
