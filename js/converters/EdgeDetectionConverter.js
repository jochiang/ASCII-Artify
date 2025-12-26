/**
 * Edge Detection Converter
 * Uses Canny edge detection to create distinctive ASCII art:
 * - Edges → uppercase characters (by brightness)
 * - Fill → lowercase/punctuation characters (by brightness)
 * - Darker pixels → smaller/lighter characters
 * - Color sampled from downsampled image
 */

import BaseConverter from './BaseConverter.js';
import CannyEdgeDetection from '../utils/CannyEdgeDetection.js';

export default class EdgeDetectionConverter extends BaseConverter {
  constructor() {
    super();
  }

  /**
   * Get converter name
   * @returns {string}
   */
  getName() {
    return 'Edge Detection';
  }

  /**
   * Get converter description
   * @returns {string}
   */
  getDescription() {
    return 'Canny edge detection with size-based character selection';
  }

  /**
   * Convert image to ASCII using edge detection
   * @param {ImageData} imageData - Source image data
   * @param {Object} options - Conversion options
   * @param {number} options.width - Target ASCII width
   * @param {string} options.edgeCharSet - Characters for edges (light to heavy)
   * @param {string} options.fillCharSet - Characters for fill (small to large)
   * @param {number} options.cannyLowThreshold - Canny low threshold (0-255)
   * @param {number} options.cannyHighThreshold - Canny high threshold (0-255)
   * @returns {{chars: string[][], colors: string[][]}}
   */
  convert(imageData, options = {}) {
    const {
      width: targetWidth = 100,
      edgeCharSet = 'ILJTFYVCXZAHKNMBDPQRUWG@#%&',
      fillCharSet = ' .`\',;:_-~"<>+*^ilcstfvoabdeghknpqruymwxzj',
      cannyLowThreshold = 50,
      cannyHighThreshold = 150,
      colorMode = 'monochrome'
    } = options;

    const { width: imgWidth, height: imgHeight, data } = imageData;

    // Calculate dimensions
    const charWidth = imgWidth / targetWidth;
    const charHeight = charWidth * 2; // ASCII chars are roughly 2x taller than wide
    const targetHeight = Math.floor(imgHeight / charHeight);

    // Downsample image for edge detection
    const downsampledWidth = targetWidth;
    const downsampledHeight = targetHeight;
    const downsampledRGBA = this.downsampleImage(
      data,
      imgWidth,
      imgHeight,
      downsampledWidth,
      downsampledHeight
    );

    // Convert downsampled image to grayscale for Canny
    const grayscale = CannyEdgeDetection.rgbaToGrayscale(
      downsampledRGBA,
      downsampledWidth,
      downsampledHeight
    );

    // Run Canny edge detection
    const edgeMap = CannyEdgeDetection.detectEdges(
      grayscale,
      downsampledWidth,
      downsampledHeight,
      cannyLowThreshold,
      cannyHighThreshold
    );

    // Generate ASCII art
    const chars = [];
    const colors = [];

    for (let y = 0; y < targetHeight; y++) {
      const charRow = [];
      const colorRow = [];

      for (let x = 0; x < targetWidth; x++) {
        const index = y * downsampledWidth + x;

        // Check if this is an edge pixel
        const isEdge = edgeMap[index] === 255;

        // Get brightness from grayscale
        const brightness = grayscale[index];

        // Select character based on edge status and brightness
        let char;
        if (isEdge) {
          // Edge: use uppercase characters
          // Darker → lighter chars (I, L), Brighter → heavier chars (&, #)
          char = this.getCharForBrightness(brightness, edgeCharSet);
        } else {
          // Fill: use lowercase/punctuation characters
          // Darker → smaller chars (space, period), Brighter → larger chars (m, w, j)
          char = this.getCharForBrightness(brightness, fillCharSet);
        }

        // Determine color based on colorMode
        let color;
        if (colorMode === 'color') {
          // Sample color from downsampled RGBA image
          const r = downsampledRGBA[index * 4];
          const g = downsampledRGBA[index * 4 + 1];
          const b = downsampledRGBA[index * 4 + 2];
          // Boost luminance for better visibility on dark background
          const boosted = this.boostLuminance(r, g, b);
          color = `rgb(${boosted.r},${boosted.g},${boosted.b})`;
        } else {
          // Monochrome mode uses white on black
          color = '#ffffff';
        }

        charRow.push(char);
        colorRow.push(color);
      }

      chars.push(charRow);
      colors.push(colorRow);
    }

    return { chars, colors, width: targetWidth, height: targetHeight };
  }

  /**
   * Downsample RGBA image to target dimensions
   * Uses area averaging for better quality
   * @param {Uint8ClampedArray} data - Source RGBA data
   * @param {number} srcWidth - Source width
   * @param {number} srcHeight - Source height
   * @param {number} dstWidth - Destination width
   * @param {number} dstHeight - Destination height
   * @returns {Uint8ClampedArray} - Downsampled RGBA data
   */
  downsampleImage(data, srcWidth, srcHeight, dstWidth, dstHeight) {
    const downsampled = new Uint8ClampedArray(dstWidth * dstHeight * 4);

    const xRatio = srcWidth / dstWidth;
    const yRatio = srcHeight / dstHeight;

    for (let dy = 0; dy < dstHeight; dy++) {
      for (let dx = 0; dx < dstWidth; dx++) {
        // Calculate source rectangle
        const sx1 = Math.floor(dx * xRatio);
        const sy1 = Math.floor(dy * yRatio);
        const sx2 = Math.ceil((dx + 1) * xRatio);
        const sy2 = Math.ceil((dy + 1) * yRatio);

        // Average all pixels in source rectangle
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        for (let sy = sy1; sy < sy2 && sy < srcHeight; sy++) {
          for (let sx = sx1; sx < sx2 && sx < srcWidth; sx++) {
            const srcIndex = (sy * srcWidth + sx) * 4;
            r += data[srcIndex];
            g += data[srcIndex + 1];
            b += data[srcIndex + 2];
            a += data[srcIndex + 3];
            count++;
          }
        }

        // Store averaged pixel
        const dstIndex = (dy * dstWidth + dx) * 4;
        downsampled[dstIndex] = Math.round(r / count);
        downsampled[dstIndex + 1] = Math.round(g / count);
        downsampled[dstIndex + 2] = Math.round(b / count);
        downsampled[dstIndex + 3] = Math.round(a / count);
      }
    }

    return downsampled;
  }
}
