/**
 * DensityConverter - Monochrome ASCII converter using brightness-to-character mapping
 * Maps pixel brightness to characters in the character set
 */
import BaseConverter from './BaseConverter.js';

export default class DensityConverter extends BaseConverter {
  /**
   * Convert ImageData to ASCII art using brightness density
   * @param {ImageData} imageData - Image data to convert
   * @param {Object} options - Conversion options
   * @returns {Object} - { chars: string[][], colors: string[][] }
   */
  convert(imageData, options) {
    const { charSet, width, colorMode, saturationBoost = 1.0 } = options;

    // Calculate ASCII grid dimensions
    const aspectRatio = imageData.height / imageData.width;
    const height = Math.floor(width * aspectRatio * 0.5); // 0.5 to account for character aspect ratio

    // Calculate cell size in pixels
    const cellWidth = imageData.width / width;
    const cellHeight = imageData.height / height;

    // Initialize output arrays
    const chars = [];
    const colors = [];

    // Process each cell in the ASCII grid
    for (let row = 0; row < height; row++) {
      const charRow = [];
      const colorRow = [];

      for (let col = 0; col < width; col++) {
        // Sample pixel at cell center
        const x = Math.floor(col * cellWidth + cellWidth / 2);
        const y = Math.floor(row * cellHeight + cellHeight / 2);

        // Get pixel data
        const pixel = this.getPixel(imageData, x, y);

        // Calculate brightness
        const brightness = this.calculateBrightness(pixel.r, pixel.g, pixel.b);

        // Map brightness to character
        const charIndex = this.brightnessToCharIndex(brightness, charSet);
        const char = charSet[charIndex];

        charRow.push(char);

        // Store color if in color mode
        if (colorMode === 'color') {
          // Apply saturation boost, then luminance boost for better visibility
          const saturated = this.boostSaturation(pixel.r, pixel.g, pixel.b, saturationBoost);
          const boosted = this.boostLuminance(saturated.r, saturated.g, saturated.b);
          colorRow.push(`rgb(${boosted.r}, ${boosted.g}, ${boosted.b})`);
        } else {
          // Monochrome mode uses white on black
          colorRow.push('#ffffff');
        }
      }

      chars.push(charRow);
      colors.push(colorRow);
    }

    return {
      chars,
      colors,
      width,
      height
    };
  }

  /**
   * Get converter name
   * @returns {string}
   */
  getName() {
    return 'DensityConverter';
  }

  /**
   * Get converter description
   * @returns {string}
   */
  getDescription() {
    return 'Converts images to ASCII art based on pixel brightness density';
  }
}
