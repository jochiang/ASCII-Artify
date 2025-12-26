/**
 * UIController - Coordinates all UI components
 */
import EventBus from '../utils/EventBus.js';

export default class UIController {
  constructor(inputHandler, controlPanel, imageProcessor, videoProcessor = null, videoControls = null) {
    this.inputHandler = inputHandler;
    this.controlPanel = controlPanel;
    this.imageProcessor = imageProcessor;
    this.videoProcessor = videoProcessor;
    this.videoControls = videoControls;
    this.previewContainer = document.getElementById('previewContainer');
    this.statusMessage = document.getElementById('statusMessage');
    this.currentMode = 'image'; // 'image' or 'video'

    this.init();
  }

  /**
   * Initialize event listeners
   */
  init() {
    // Listen for file selection
    EventBus.on('file:selected', (data) => this.handleFileSelected(data));
    EventBus.on('file:video-selected', (data) => this.handleVideoSelected(data));

    // Listen for conversion action
    EventBus.on('action:convert', (settings) => this.handleConvert(settings));

    // Listen for processing events
    EventBus.on('processing:start', () => this.handleProcessingStart());
    EventBus.on('processing:complete', (data) => this.handleProcessingComplete(data));
    EventBus.on('processing:error', (data) => this.handleProcessingError(data));

    // Listen for reprocessing events
    EventBus.on('reprocessing:start', () => this.handleProcessingStart());
    EventBus.on('reprocessing:complete', (data) => this.handleProcessingComplete(data));
    EventBus.on('reprocessing:error', (data) => this.handleProcessingError(data));

    // Listen for input errors
    EventBus.on('input:error', (data) => this.showMessage(data.message, 'error'));

    // Video events
    if (this.videoProcessor && this.videoControls) {
      EventBus.on('video:loaded', (data) => this.handleVideoLoaded(data));
      EventBus.on('video:preview-ready', (data) => this.handleVideoPreviewReady(data));
      EventBus.on('video:progress', (data) => this.handleVideoProgress(data));
      EventBus.on('video:process-complete', (data) => this.handleVideoProcessComplete(data));
      EventBus.on('video:process-error', (data) => this.handleVideoProcessError(data));
      EventBus.on('video:process-cancelled', () => this.handleVideoProcessCancelled());
      EventBus.on('video:settings-changed', () => this.handleVideoSettingsChanged());
      EventBus.on('ffmpeg:loading', () => this.showMessage('Loading video processor...', 'info'));
      EventBus.on('ffmpeg:loaded', () => this.showMessage('Video processor ready!', 'success'));
      EventBus.on('ffmpeg:error', (data) => this.showMessage('Failed to load video processor: ' + data.error.message, 'error'));
    }

    // Settings changes are stored but don't auto-convert
    // User must click "Convert to ASCII" to apply new settings
  }

  /**
   * Handle file selected
   * @param {Object} data - { file }
   */
  handleFileSelected(data) {
    // Clear cached image data so next Convert loads the new file
    this.imageProcessor.clear();
    this.showMessage(`File selected: ${data.file.name}`, 'success');
    this.clearPreview();
  }

  /**
   * Handle convert action
   * @param {Object} settings
   */
  async handleConvert(settings) {
    try {
      const file = this.inputHandler.getCurrentFile();

      if (!file) {
        this.showMessage('Please select a file first', 'error');
        return;
      }

      // Check if we can reprocess (image already loaded)
      if (this.imageProcessor.getCurrentImageData()) {
        // Reprocess with new settings
        this.imageProcessor.reprocess(settings);
      } else {
        // Process from file
        await this.imageProcessor.process(file, settings);
      }
    } catch (error) {
      console.error('Conversion error:', error);
      this.showMessage('Conversion failed: ' + error.message, 'error');
    }
  }

  /**
   * Handle processing start
   */
  handleProcessingStart() {
    this.controlPanel.setLoading(true);
    this.inputHandler.setEnabled(false);
    this.showLoadingPreview();
  }

  /**
   * Handle processing complete
   * @param {Object} data - { canvas }
   */
  handleProcessingComplete(data) {
    this.controlPanel.setLoading(false);
    this.inputHandler.setEnabled(true);
    this.displayCanvas(data.canvas);
    this.showMessage('Conversion complete!', 'success');
  }

  /**
   * Handle processing error
   * @param {Object} data - { error }
   */
  handleProcessingError(data) {
    this.controlPanel.setLoading(false);
    this.inputHandler.setEnabled(true);
    this.showMessage('Error: ' + data.error.message, 'error');
  }

  /**
   * Display canvas in preview
   * @param {HTMLCanvasElement} canvas
   */
  displayCanvas(canvas) {
    this.previewContainer.innerHTML = '';
    canvas.classList.add('preview-canvas');
    this.previewContainer.appendChild(canvas);
  }

  /**
   * Show loading state in preview
   */
  showLoadingPreview() {
    this.previewContainer.innerHTML = '<div class="preview-loading">Converting to ASCII art</div>';
  }

  /**
   * Clear preview
   */
  clearPreview() {
    this.previewContainer.innerHTML = '<div class="preview-placeholder"><p>Your ASCII art will appear here</p></div>';
  }

  /**
   * Show status message
   * @param {string} message
   * @param {string} type - 'success', 'error', 'warning'
   */
  showMessage(message, type = 'success') {
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.statusMessage.classList.add('hidden');
    }, 3000);
  }

  /**
   * Hide status message
   */
  hideMessage() {
    this.statusMessage.classList.add('hidden');
  }

  /**
   * Set UI mode (image or video)
   * @param {string} mode - 'image' or 'video'
   */
  setMode(mode) {
    this.currentMode = mode;

    if (mode === 'video') {
      // Show video controls, hide convert button
      if (this.videoControls) {
        this.videoControls.show();
      }
      this.controlPanel.hide();
    } else {
      // Show control panel, hide video controls
      if (this.videoControls) {
        this.videoControls.hide();
      }
      this.controlPanel.show();
    }
  }

  /**
   * Handle video file selected
   * @param {Object} data - { file }
   */
  async handleVideoSelected(data) {
    if (!this.videoProcessor) {
      this.showMessage('Video processing is not supported', 'error');
      return;
    }

    this.setMode('video');
    this.showMessage(`Loading video: ${data.file.name}`, 'info');
    this.clearPreview();

    try {
      await this.videoProcessor.loadVideo(data.file);
    } catch (error) {
      this.showMessage('Failed to load video: ' + error.message, 'error');
    }
  }

  /**
   * Handle video loaded
   * @param {Object} data - { videoInfo, previewFrame }
   */
  handleVideoLoaded(data) {
    this.videoControls.setVideoInfo(data.videoInfo);
    this.videoControls.setupPreviewSlider(data.videoInfo.duration, (time) => {
      this.handlePreviewSliderChange(time);
    });

    // Convert and display first frame using video settings
    const settings = this.videoControls.getSettings();
    this.videoProcessor.convertPreviewFrame(settings);

    this.videoControls.setConvertEnabled(true, () => this.handleVideoConvert());
    this.showMessage('Video loaded successfully!', 'success');
  }

  /**
   * Handle preview slider change
   * @param {number} time - Time in seconds
   */
  async handlePreviewSliderChange(time) {
    try {
      await this.videoProcessor.getPreviewFrame(time);
      const settings = this.videoControls.getSettings();
      this.videoProcessor.convertPreviewFrame(settings);
    } catch (error) {
      console.error('Failed to update preview:', error);
    }
  }

  /**
   * Handle video settings changed - update preview
   */
  handleVideoSettingsChanged() {
    if (this.currentMode === 'video' && this.videoProcessor.previewFrameData) {
      try {
        const settings = this.videoControls.getSettings();
        this.videoProcessor.convertPreviewFrame(settings);
      } catch (error) {
        console.error('Failed to update preview with new settings:', error);
      }
    }
  }

  /**
   * Handle video preview ready
   * @param {Object} data - { canvas }
   */
  handleVideoPreviewReady(data) {
    this.displayCanvas(data.canvas);
  }

  /**
   * Handle video convert button
   */
  async handleVideoConvert() {
    const settings = this.videoControls.getSettings();

    this.videoControls.setCancelEnabled(true, () => {
      this.videoProcessor.cancel();
    });
    this.videoControls.setConvertEnabled(false, null);
    this.inputHandler.setEnabled(false);

    try {
      await this.videoProcessor.processVideo(settings);
    } catch (error) {
      console.error('Video processing error:', error);
    }
  }

  /**
   * Handle video progress
   * @param {Object} data - { phase, progress, message }
   */
  handleVideoProgress(data) {
    this.videoControls.setProgress(data.phase, data.progress);
    this.showMessage(data.message, 'info');
  }

  /**
   * Handle video processing complete
   * @param {Object} data - { videoBlob }
   */
  handleVideoProcessComplete(data) {
    this.videoControls.setCancelEnabled(false, null);
    this.videoControls.setConvertEnabled(true, () => this.handleVideoConvert());
    this.inputHandler.setEnabled(true);
    this.showMessage('Video conversion complete!', 'success');

    // Trigger download
    EventBus.emit('export:video', { blob: data.videoBlob });
  }

  /**
   * Handle video processing error
   * @param {Object} data - { error }
   */
  handleVideoProcessError(data) {
    this.videoControls.setCancelEnabled(false, null);
    this.videoControls.setConvertEnabled(true, () => this.handleVideoConvert());
    this.inputHandler.setEnabled(true);
    this.showMessage('Video processing failed: ' + data.error.message, 'error');
  }

  /**
   * Handle video processing cancelled
   */
  handleVideoProcessCancelled() {
    this.videoControls.setCancelEnabled(false, null);
    this.videoControls.setConvertEnabled(true, () => this.handleVideoConvert());
    this.inputHandler.setEnabled(true);
    this.showMessage('Video processing cancelled', 'warning');
  }
}
