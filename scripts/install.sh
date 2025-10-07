#!/bin/bash

# Flickr to Google Photos CLI Installation Script

echo "🖼️  Installing Flickr to Google Photos CLI..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build project"
    exit 1
fi

# Make CLI globally available
echo "🔗 Making CLI globally available..."
npm link

if [ $? -ne 0 ]; then
    echo "⚠️  Failed to link globally. You can still use 'npm run dev' to run commands."
fi

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run 'flickr-to-google setup' to configure your API credentials"
echo "2. Run 'flickr-to-google list-albums' to see your Flickr albums"
echo "3. Run 'flickr-to-google transfer' to start transferring albums"
echo ""
echo "For more information, see the README.md file."
