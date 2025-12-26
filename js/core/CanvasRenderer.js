/**
 * CanvasRenderer - Renders ASCII data to a canvas element
 * Converts ASCII characters and colors to visual output
 */
import config from '../config.js';

export default class CanvasRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Render ASCII data to a canvas
   * @param {Object} asciiData - ASCII data from converter
   * @param {string[][]} asciiData.chars - 2D array of characters
   * @param {string[][]} asciiData.colors - 2D array of colors
   * @param {number} asciiData.width - Width in characters
   * @param {number} asciiData.height - Height in characters
   * @param {Object} renderOptions - Rendering options
   * @returns {HTMLCanvasElement} - Rendered canvas element
   */
  render(asciiData, renderOptions = {}) {
    const { chars, colors, width, height } = asciiData;

    // Merge with default config
    const options = {
      fontSize: renderOptions.fontSize || config.canvas.fontSize,
      fontFamily: renderOptions.fontFamily || config.canvas.fontFamily,
      lineHeight: renderOptions.lineHeight || config.canvas.lineHeight,
      backgroundColor: renderOptions.backgroundColor || config.canvas.backgroundColor,
      foregroundColor: renderOptions.foregroundColor || config.canvas.foregroundColor
    };

    // Calculate canvas dimensions
    const charWidth = options.fontSize * 0.6; // Monospace character width approximation
    const charHeight = options.fontSize * options.lineHeight;

    const canvasWidth = Math.ceil(width * charWidth);
    const canvasHeight = Math.ceil(height * charHeight);

    // Create or resize canvas
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;

    this.ctx = this.canvas.getContext('2d');

    // Fill background
    this.ctx.fillStyle = options.backgroundColor;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Set font properties
    this.ctx.font = `${options.fontSize}px ${options.fontFamily}`;
    this.ctx.textBaseline = 'top';

    // Render each character
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const char = chars[row][col];
        const color = colors[row][col];

        const x = col * charWidth;
        const y = row * charHeight;

        this.ctx.fillStyle = color;
        this.ctx.fillText(char, x, y);
      }
    }

    return this.canvas;
  }

  /**
   * Get the current canvas element
   * @returns {HTMLCanvasElement|null}
   */
  getCanvas() {
    return this.canvas;
  }

  /**
   * Convert canvas to data URL
   * @param {string} format - Image format (default: 'image/png')
   * @param {number} quality - Image quality for lossy formats (0-1)
   * @returns {string} - Data URL
   */
  toDataURL(format = 'image/png', quality = 1.0) {
    if (!this.canvas) {
      throw new Error('No canvas to export. Call render() first.');
    }
    return this.canvas.toDataURL(format, quality);
  }

  /**
   * Convert canvas to Blob
   * @param {string} format - Image format (default: 'image/png')
   * @param {number} quality - Image quality for lossy formats (0-1)
   * @returns {Promise<Blob>} - Promise resolving to Blob
   */
  toBlob(format = 'image/png', quality = 1.0) {
    if (!this.canvas) {
      throw new Error('No canvas to export. Call render() first.');
    }

    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        format,
        quality
      );
    });
  }

  /**
   * Clear the canvas
   */
  clear() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Dispose of the canvas
   */
  dispose() {
    this.clear();
    this.canvas = null;
    this.ctx = null;
  }
}
