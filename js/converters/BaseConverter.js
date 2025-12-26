/**
 * BaseConverter - Abstract base class for ASCII converters
 * Defines the interface that all converters must implement
 */
export default class BaseConverter {
  /**
   * Convert ImageData to ASCII art
   * @param {ImageData} imageData - Image data to convert
   * @param {Object} options - Conversion options
   * @param {string} options.charSet - Character set to use
   * @param {number} options.width - ASCII width in characters
   * @param {string} options.colorMode - 'monochrome' or 'color'
   * @returns {Object} - { chars: string[][], colors: string[][] }
   */
  convert(imageData, options) {
    throw new Error('BaseConverter.convert() must be implemented by subclass');
  }

  /**
   * Get converter name
   * @returns {string}
   */
  getName() {
    return this.constructor.name;
  }

  /**
   * Get converter description
   * @returns {string}
   */
  getDescription() {
    return 'Base converter (override in subclass)';
  }

  /**
   * Helper method to calculate brightness from RGB values
   * @param {number} r - Red value (0-255)
   * @param {number} g - Green value (0-255)
   * @param {number} b - Blue value (0-255)
   * @returns {number} - Brightness value (0-255)
   */
  calculateBrightness(r, g, b) {
    // Simple average method
    return (r + g + b) / 3;
  }

  /**
   * Helper method to map brightness to character index
   * @param {number} brightness - Brightness value (0-255)
   * @param {string} charSet - Character set
   * @returns {number} - Character index
   */
  brightnessToCharIndex(brightness, charSet) {
    const normalized = brightness / 255;
    const index = Math.floor(normalized * (charSet.length - 1));
    return Math.min(index, charSet.length - 1);
  }

  /**
   * Helper method to get character for brightness value
   * @param {number} brightness - Brightness value (0-255)
   * @param {string} charSet - Character set
   * @returns {string} - Character from set
   */
  getCharForBrightness(brightness, charSet) {
    const index = this.brightnessToCharIndex(brightness, charSet);
    return charSet[index];
  }

  /**
   * Helper method to get pixel data at specific coordinates
   * @param {ImageData} imageData - Image data
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object} - { r, g, b, a }
   */
  getPixel(imageData, x, y) {
    const index = (y * imageData.width + x) * 4;
    return {
      r: imageData.data[index],
      g: imageData.data[index + 1],
      b: imageData.data[index + 2],
      a: imageData.data[index + 3]
    };
  }

  /**
   * Boost luminance of RGB color for better visibility on dark backgrounds
   * @param {number} r - Red value (0-255)
   * @param {number} g - Green value (0-255)
   * @param {number} b - Blue value (0-255)
   * @param {number} boost - Boost factor (default 1.5)
   * @returns {Object} - { r, g, b } with boosted values
   */
  boostLuminance(r, g, b, boost = 1.5) {
    // Boost RGB values while preserving color ratios
    const maxVal = Math.max(r, g, b);

    // If the pixel is very dark, boost more aggressively
    const darkBoost = maxVal < 50 ? boost * 1.3 : boost;

    return {
      r: Math.min(255, Math.round(r * darkBoost)),
      g: Math.min(255, Math.round(g * darkBoost)),
      b: Math.min(255, Math.round(b * darkBoost))
    };
  }
}
