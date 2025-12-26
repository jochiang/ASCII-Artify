/**
 * ExportHandler - Handles PNG and text file downloads
 */
import EventBus from '../utils/EventBus.js';

export default class ExportHandler {
  constructor(imageProcessor, canvasRenderer) {
    this.imageProcessor = imageProcessor;
    this.canvasRenderer = canvasRenderer;

    this.init();
  }

  /**
   * Initialize event listeners
   */
  init() {
    EventBus.on('action:export-png', () => this.exportAsPng());
    EventBus.on('action:export-text', () => this.exportAsText());
    EventBus.on('export:video', (data) => this.saveVideo(data.blob));
  }

  /**
   * Export ASCII art as PNG
   */
  async exportAsPng() {
    try {
      const canvas = this.canvasRenderer.getCanvas();
      if (!canvas) {
        throw new Error('No canvas available to export');
      }

      // Convert canvas to blob
      const blob = await this.canvasRenderer.toBlob('image/png', 1.0);

      // Download blob
      this.downloadBlob(blob, 'ascii-art.png');

      EventBus.emit('export:success', { format: 'png' });
    } catch (error) {
      console.error('PNG export error:', error);
      EventBus.emit('export:error', { format: 'png', error });
      throw error;
    }
  }

  /**
   * Export ASCII art as text file
   */
  exportAsText() {
    try {
      const asciiText = this.imageProcessor.getAsciiText();
      if (!asciiText) {
        throw new Error('No ASCII data available to export');
      }

      // Create blob from text
      const blob = new Blob([asciiText], { type: 'text/plain;charset=utf-8' });

      // Download blob
      this.downloadBlob(blob, 'ascii-art.txt');

      EventBus.emit('export:success', { format: 'text' });
    } catch (error) {
      console.error('Text export error:', error);
      EventBus.emit('export:error', { format: 'text', error });
      throw error;
    }
  }

  /**
   * Download a blob as a file
   * @param {Blob} blob - Blob to download
   * @param {string} filename - Filename for download
   */
  downloadBlob(blob, filename) {
    // Create blob URL
    const url = URL.createObjectURL(blob);

    // Create temporary anchor element
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';

    // Trigger download
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Export canvas as data URL
   * @param {string} format - Image format (default: 'image/png')
   * @returns {string} - Data URL
   */
  getDataURL(format = 'image/png') {
    return this.canvasRenderer.toDataURL(format, 1.0);
  }

  /**
   * Copy ASCII text to clipboard
   */
  async copyToClipboard() {
    try {
      const asciiText = this.imageProcessor.getAsciiText();
      if (!asciiText) {
        throw new Error('No ASCII data available to copy');
      }

      await navigator.clipboard.writeText(asciiText);
      EventBus.emit('clipboard:success');
      return true;
    } catch (error) {
      console.error('Clipboard copy error:', error);
      EventBus.emit('clipboard:error', { error });
      return false;
    }
  }

  /**
   * Save video as MP4
   * @param {Blob} blob - Video blob
   * @param {string} filename - Optional filename
   */
  saveVideo(blob, filename = 'ascii-video.mp4') {
    try {
      this.downloadBlob(blob, filename);
      EventBus.emit('export:success', { format: 'video' });
    } catch (error) {
      console.error('Video export error:', error);
      EventBus.emit('export:error', { format: 'video', error });
      throw error;
    }
  }
}
