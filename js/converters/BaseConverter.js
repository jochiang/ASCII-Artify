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
   * @returns {Object} - { r, g, b } with boosted values
   */
  boostLuminance(r, g, b) {
    // Boost RGB values while preserving color ratios
    // 1.35x for normal colors, 1.7x for very dark pixels
    const maxVal = Math.max(r, g, b);
    const boost = maxVal < 50 ? 1.7 : 1.35;

    return {
      r: Math.min(255, Math.round(r * boost)),
      g: Math.min(255, Math.round(g * boost)),
      b: Math.min(255, Math.round(b * boost))
    };
  }

  /**
   * Boost saturation of RGB color
   * Converts to HSL, multiplies saturation, converts back to RGB
   * @param {number} r - Red value (0-255)
   * @param {number} g - Green value (0-255)
   * @param {number} b - Blue value (0-255)
   * @param {number} boostFactor - Saturation multiplier (1.0 = no change, 2.0 = double)
   * @returns {Object} - { r, g, b } with boosted saturation
   */
  boostSaturation(r, g, b, boostFactor = 1.0) {
    if (boostFactor === 1.0) {
      return { r, g, b };
    }

    // Normalize RGB to 0-1
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    // Find min/max for HSL conversion
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;

    // Calculate lightness
    const l = (max + min) / 2;

    // If grayscale, return as-is
    if (delta === 0) {
      return { r, g, b };
    }

    // Calculate saturation
    let s = delta / (1 - Math.abs(2 * l - 1));

    // Calculate hue
    let h;
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = h * 60;
    if (h < 0) h += 360;

    // Boost saturation (clamped to 0-1)
    s = Math.min(1, Math.max(0, s * boostFactor));

    // Convert back to RGB
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let rOut, gOut, bOut;
    if (h < 60) {
      rOut = c; gOut = x; bOut = 0;
    } else if (h < 120) {
      rOut = x; gOut = c; bOut = 0;
    } else if (h < 180) {
      rOut = 0; gOut = c; bOut = x;
    } else if (h < 240) {
      rOut = 0; gOut = x; bOut = c;
    } else if (h < 300) {
      rOut = x; gOut = 0; bOut = c;
    } else {
      rOut = c; gOut = 0; bOut = x;
    }

    return {
      r: Math.round((rOut + m) * 255),
      g: Math.round((gOut + m) * 255),
      b: Math.round((bOut + m) * 255)
    };
  }
}
