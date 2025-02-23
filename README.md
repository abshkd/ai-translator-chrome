# AI Page Translator

A Chrome extension by [Airith Pte Ltd](https://airith.com) that provides real-time AI-powered translation of web pages and images using OpenRouter API.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Commercial License](https://img.shields.io/badge/License-Commercial-blue.svg)](LICENSE)

## Features

- Real-time text translation with AI
- Image text detection and translation
- Automatic language detection
- Customizable target language selection
- Overlay translations for images
- Smart rate limiting and caching
- Preserves page layout and formatting

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Configuration

1. Click the extension icon and go to Options
2. Enter your OpenRouter API key
3. Configure your preferred target language
4. Optional: Enable "Always translate images" for image translation regardless of source language

## Development

### Prerequisites

- Node.js and npm installed
- Chrome browser
- OpenRouter API key

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure your API key in the extension options

### Building

The extension uses vanilla JavaScript and can be loaded directly into Chrome. For production:

1. Ensure all files are minified
2. Update version in manifest.json
3. Test thoroughly
4. Package through Chrome Web Store Developer Dashboard

## Rate Limiting

The extension implements smart rate limiting to prevent API overuse:

- Maximum 300 requests per minute
- 250ms minimum interval between translations
- Automatic cooldown and recovery system
- Request prioritization for visible content
- Efficient caching system

## Architecture

- `background.js`: Handles API communication and background tasks
- `content.js`: Manages page translation and DOM manipulation
- `popup.jsx`: User interface for language selection and controls
- `options.html`: Configuration interface
- `manifest.json`: Extension configuration and permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is dual-licensed:

1. **MIT License** - For non-commercial use. See [LICENSE](LICENSE) for details.
2. **Commercial License** - For commercial use, please contact Airith Pte Ltd for licensing terms.

Copyright (c) 2024 Airith Pte Ltd. All rights reserved.

## Commercial Usage

For commercial licensing inquiries, please contact:

Airith Pte Ltd  
Website: [https://airith.com](https://airith.com)

Commercial usage includes but is not limited to:
- Using the extension in a commercial product
- Using the extension in a commercial service
- Distributing the extension as part of a commercial product or service
- Modifying the extension for commercial purposes
