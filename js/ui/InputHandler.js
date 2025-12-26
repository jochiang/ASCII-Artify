/**
 * InputHandler - Handles file input and drag-drop functionality
 */
import EventBus from '../utils/EventBus.js';
import config from '../config.js';

export default class InputHandler {
  constructor(fileInputId, dropZoneId) {
    this.fileInput = document.getElementById(fileInputId);
    this.dropZone = document.getElementById(dropZoneId);
    this.currentFile = null;

    this.init();
  }

  /**
   * Initialize event listeners
   */
  init() {
    if (!this.fileInput || !this.dropZone) {
      throw new Error('File input or drop zone element not found');
    }

    // File input change
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drop zone click
    this.dropZone.addEventListener('click', () => this.fileInput.click());

    // Drag and drop events
    this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));
  }

  /**
   * Handle file selection from input
   * @param {Event} event
   */
  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
      // Clear input value so selecting the same file again triggers change event
      event.target.value = '';
    }
  }

  /**
   * Handle drag over event
   * @param {DragEvent} event
   */
  handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dropZone.classList.add('drag-over');
  }

  /**
   * Handle drag leave event
   * @param {DragEvent} event
   */
  handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dropZone.classList.remove('drag-over');
  }

  /**
   * Handle drop event
   * @param {DragEvent} event
   */
  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dropZone.classList.remove('drag-over');

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      this.processFile(files[0]);
    }
  }

  /**
   * Process and validate file
   * @param {File} file
   */
  processFile(file) {
    // Validate file type
    if (!this.isValidFile(file)) {
      EventBus.emit('input:error', {
        message: `Invalid file type. Supported formats: ${this.getSupportedFormatsString()}`
      });
      return;
    }

    // Validate file size (max 50MB for videos, 10MB for images)
    const maxSize = this.isVideoFile(file) ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      EventBus.emit('input:error', {
        message: `File is too large. Maximum size is ${this.isVideoFile(file) ? '50MB' : '10MB'}.`
      });
      return;
    }

    this.currentFile = file;

    // Emit different events based on file type
    if (this.isVideoFile(file)) {
      EventBus.emit('file:video-selected', { file });
    } else {
      EventBus.emit('file:selected', { file });
    }
  }

  /**
   * Check if file is a video
   * @param {File} file
   * @returns {boolean}
   */
  isVideoFile(file) {
    return config.supportedVideoFormats.includes(file.type);
  }

  /**
   * Check if file type is valid
   * @param {File} file
   * @returns {boolean}
   */
  isValidFile(file) {
    const supportedFormats = [
      ...config.supportedImageFormats,
      ...config.supportedVideoFormats
    ];
    return supportedFormats.includes(file.type);
  }

  /**
   * Get supported formats as a readable string
   * @returns {string}
   */
  getSupportedFormatsString() {
    const imageFormats = config.supportedImageFormats.map(type => type.split('/')[1].toUpperCase());
    return imageFormats.join(', ');
  }

  /**
   * Get current file
   * @returns {File|null}
   */
  getCurrentFile() {
    return this.currentFile;
  }

  /**
   * Clear current file
   */
  clear() {
    this.currentFile = null;
    this.fileInput.value = '';
  }

  /**
   * Enable/disable input
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.fileInput.disabled = !enabled;
    if (enabled) {
      this.dropZone.style.cursor = 'pointer';
      this.dropZone.style.opacity = '1';
    } else {
      this.dropZone.style.cursor = 'not-allowed';
      this.dropZone.style.opacity = '0.5';
    }
  }
}
