/**
 * ImageProcessor - Complete image processing pipeline
 * File → Image → ImageData → ASCII → Canvas → PNG
 */
import EventBus from '../utils/EventBus.js';

export default class ImageProcessor {
  constructor(asciiEngine, canvasRenderer) {
    this.asciiEngine = asciiEngine;
    this.canvasRenderer = canvasRenderer;
    this.currentImage = null;
    this.currentImageData = null;
    this.currentAsciiData = null;
  }

  /**
   * Load image from File object
   * @param {File} file - Image file
   * @returns {Promise<HTMLImageElement>}
   */
  loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          this.currentImage = img;
          EventBus.emit('image:loaded', { image: img });
          resolve(img);
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = e.target.result;
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Extract ImageData from an image
   * @param {HTMLImageElement} image - Image element
   * @returns {ImageData}
   */
  extractImageData(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.currentImageData = imageData;

    EventBus.emit('imagedata:extracted', { imageData });

    return imageData;
  }

  /**
   * Convert image to ASCII
   * @param {Object} options - Conversion options
   * @returns {Object} - ASCII data
   */
  convertToAscii(options) {
    if (!this.currentImageData) {
      throw new Error('No image data available. Load an image first.');
    }

    const asciiData = this.asciiEngine.convert(this.currentImageData, options);
    this.currentAsciiData = asciiData;

    EventBus.emit('ascii:generated', { asciiData });

    return asciiData;
  }

  /**
   * Render ASCII to canvas
   * @param {Object} renderOptions - Rendering options
   * @returns {HTMLCanvasElement}
   */
  renderToCanvas(renderOptions) {
    if (!this.currentAsciiData) {
      throw new Error('No ASCII data available. Convert to ASCII first.');
    }

    const canvas = this.canvasRenderer.render(this.currentAsciiData, renderOptions);

    EventBus.emit('canvas:rendered', { canvas });

    return canvas;
  }

  /**
   * Process complete pipeline: File → Image → ImageData → ASCII → Canvas
   * @param {File} file - Image file
   * @param {Object} options - Conversion and rendering options
   * @returns {Promise<HTMLCanvasElement>}
   */
  async process(file, options) {
    try {
      EventBus.emit('processing:start', { file });

      // Load image
      const image = await this.loadImageFromFile(file);

      // Extract image data
      const imageData = this.extractImageData(image);

      // Convert to ASCII
      const asciiData = this.convertToAscii(options);

      // Render to canvas
      const canvas = this.renderToCanvas(options.renderOptions);

      EventBus.emit('processing:complete', { canvas });

      return canvas;
    } catch (error) {
      EventBus.emit('processing:error', { error });
      throw error;
    }
  }

  /**
   * Reprocess with new options (uses cached image data)
   * @param {Object} options - Conversion and rendering options
   * @returns {HTMLCanvasElement}
   */
  reprocess(options) {
    if (!this.currentImageData) {
      throw new Error('No image data available. Load an image first.');
    }

    try {
      EventBus.emit('reprocessing:start', { options });

      // Convert to ASCII with new options
      const asciiData = this.convertToAscii(options);

      // Render to canvas
      const canvas = this.renderToCanvas(options.renderOptions);

      EventBus.emit('reprocessing:complete', { canvas });

      return canvas;
    } catch (error) {
      EventBus.emit('reprocessing:error', { error });
      throw error;
    }
  }

  /**
   * Get current image
   * @returns {HTMLImageElement|null}
   */
  getCurrentImage() {
    return this.currentImage;
  }

  /**
   * Get current ImageData
   * @returns {ImageData|null}
   */
  getCurrentImageData() {
    return this.currentImageData;
  }

  /**
   * Get current ASCII data
   * @returns {Object|null}
   */
  getCurrentAsciiData() {
    return this.currentAsciiData;
  }

  /**
   * Get ASCII as text string
   * @returns {string}
   */
  getAsciiText() {
    if (!this.currentAsciiData) {
      throw new Error('No ASCII data available');
    }

    return this.currentAsciiData.chars
      .map(row => row.join(''))
      .join('\n');
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.currentImage = null;
    this.currentImageData = null;
    this.currentAsciiData = null;
    this.canvasRenderer.clear();
  }
}
