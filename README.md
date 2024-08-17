# Pokemon Card Price Checker Chrome Extension

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Technical Details](#technical-details)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Pokemon Card Price Checker is a Chrome extension designed to help Pokemon card collectors and traders quickly compare prices between various online marketplaces and eBay listings. This tool provides real-time price data, profit analysis, and market insights to assist users in making informed decisions about buying and selling Pokemon cards.

## Features

- **Real-time eBay Price Comparison**: Instantly compare the current page's price with eBay listings.
- **Profit Analysis**: Calculate potential profit and Return on Investment (ROI).
- **Market Insights**: View the number of listings, sales velocity, and market saturation.
- **Recent Sales Data**: Display the 5 most recent sales with dates and prices.
- **Daily Profit Tracking**: Keep track of your daily profits from recorded purchases.
- **Multi-Platform Support**: Works on various Pokemon card marketplaces and community websites.

## Installation

1. Clone this repository or download the ZIP file.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the directory containing the extension files.
5. The Pokemon Card Price Checker icon should now appear in your Chrome toolbar.

## Usage

1. Navigate to a supported website with a Pokemon card listing.
2. Hold the Alt key and click on the card name to activate the price checker.
3. An overlay will appear with price comparisons, profit analysis, and market insights.
4. Use the "Recalculate" button to update values based on manual input changes.
5. Click "Record Purchase" to add the potential profit to your daily tracking.

## Technical Details

- **Frontend**: JavaScript, Chrome Extension APIs
- **Backend**: Python, Flask
- **APIs**: eBay Finding API
- **Data Processing**: Beautiful Soup for web scraping, statistics module for data analysis

### Project Structure

- `manifest.json`: Chrome extension configuration
- `background.js`: Background script for the extension
- `content.js`: Content script injected into web pages
- `main.py`: Flask backend API
- `ebay_api.py`: eBay API integration

## Contributing

Contributions to the Pokemon Card Price Checker are welcome! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with clear, descriptive messages.
4. Push your changes to your fork.
5. Submit a pull request to the main repository.

Please ensure your code adheres to the existing style and includes appropriate tests and documentation.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

For any questions or support, please open an issue on this GitHub repository.
