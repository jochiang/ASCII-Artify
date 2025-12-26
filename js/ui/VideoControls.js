/**
 * VideoControls - Video-specific UI management
 * Handles video info display, preview slider, progress bar, and controls
 */
import EventBus from '../utils/EventBus.js';
import config from '../config.js';

export default class VideoControls {
  constructor() {
    this.container = null;
    this.videoInfoElement = null;
    this.previewSlider = null;
    this.previewTimeDisplay = null;
    this.progressBar = null;
    this.progressText = null;
    this.convertButton = null;
    this.cancelButton = null;
    this.currentDuration = 0;
    this.onSliderChange = null;
    this.onSettingsChange = null;

    // Settings elements
    this.widthSlider = null;
    this.widthValue = null;
    this.charSetInput = null;
    this.colorModeSelect = null;
    this.converterSelect = null;
    this.edgeControls = null;
    this.cannyLowThreshold = null;
    this.cannyLowValue = null;
    this.cannyHighThreshold = null;
    this.cannyHighValue = null;

    // Audio toggle
    this.audioToggle = null;
    this.includeAudio = true;
  }

  /**
   * Initialize DOM elements
   */
  init() {
    this.container = document.getElementById('video-controls');
    this.videoInfoElement = document.getElementById('video-info');
    this.previewSlider = document.getElementById('preview-slider');
    this.previewTimeDisplay = document.getElementById('preview-time');
    this.progressBar = document.getElementById('progress-bar');
    this.progressText = document.getElementById('progress-text');
    this.convertButton = document.getElementById('convert-video-btn');
    this.cancelButton = document.getElementById('cancel-video-btn');

    // Settings elements
    this.widthSlider = document.getElementById('videoWidthSlider');
    this.widthValue = document.getElementById('videoWidthValue');
    this.charSetInput = document.getElementById('videoCharSetInput');
    this.colorModeSelect = document.getElementById('videoColorModeSelect');
    this.converterSelect = document.getElementById('videoConverterSelect');
    this.edgeControls = document.getElementById('videoEdgeControls');
    this.cannyLowThreshold = document.getElementById('videoCannyLowThreshold');
    this.cannyLowValue = document.getElementById('videoCannyLowValue');
    this.cannyHighThreshold = document.getElementById('videoCannyHighThreshold');
    this.cannyHighValue = document.getElementById('videoCannyHighValue');

    // Setup slider event listener
    if (this.previewSlider) {
      this.previewSlider.addEventListener('input', (e) => {
        const time = parseFloat(e.target.value);
        this._updateTimeDisplay(time);
        if (this.onSliderChange) {
          this.onSliderChange(time);
        }
      });
    }

    // Setup settings event listeners
    this._initSettingsListeners();
  }

  /**
   * Initialize settings event listeners
   * @private
   */
  _initSettingsListeners() {
    // Width slider
    if (this.widthSlider) {
      this.widthSlider.addEventListener('input', (e) => {
        this.widthValue.textContent = e.target.value;
        this._emitSettingsChanged();
      });
    }

    // Character set input
    if (this.charSetInput) {
      this.charSetInput.addEventListener('input', () => {
        this._emitSettingsChanged();
      });
    }

    // Color mode select
    if (this.colorModeSelect) {
      this.colorModeSelect.addEventListener('change', () => {
        this._emitSettingsChanged();
      });
    }

    // Converter select
    if (this.converterSelect) {
      this.converterSelect.addEventListener('change', (e) => {
        this._toggleEdgeControls(e.target.value);
        EventBus.emit('converter:selected', { converter: e.target.value });
        this._emitSettingsChanged();
      });
    }

    // Canny threshold sliders
    if (this.cannyLowThreshold) {
      this.cannyLowThreshold.addEventListener('input', (e) => {
        this.cannyLowValue.textContent = e.target.value;
        this._emitSettingsChanged();
      });
    }

    if (this.cannyHighThreshold) {
      this.cannyHighThreshold.addEventListener('input', (e) => {
        this.cannyHighValue.textContent = e.target.value;
        this._emitSettingsChanged();
      });
    }
  }

  /**
   * Emit settings changed event
   * @private
   */
  _emitSettingsChanged() {
    EventBus.emit('video:settings-changed', this.getSettings());
    if (this.onSettingsChange) {
      this.onSettingsChange(this.getSettings());
    }
  }

  /**
   * Toggle edge controls visibility
   * @private
   * @param {string} converter - Selected converter type
   */
  _toggleEdgeControls(converter) {
    if (this.edgeControls) {
      this.edgeControls.style.display = converter === 'edge' ? 'block' : 'none';
    }
  }

  /**
   * Get current settings
   * @returns {Object}
   */
  getSettings() {
    const settings = {
      width: parseInt(this.widthSlider?.value || config.video.maxFrameWidth),
      charSet: this.charSetInput?.value || config.ascii.defaultCharSet,
      colorMode: this.colorModeSelect?.value || 'monochrome',
      converter: this.converterSelect?.value || 'density',
      includeAudio: this.includeAudio
    };

    // Add edge detection settings if edge converter is selected
    if (settings.converter === 'edge') {
      settings.cannyLowThreshold = parseInt(this.cannyLowThreshold?.value || 50);
      settings.cannyHighThreshold = parseInt(this.cannyHighThreshold?.value || 150);
      settings.edgeCharSet = config.ascii.edgeDetection.defaultEdgeCharSet;
      settings.fillCharSet = config.ascii.edgeDetection.defaultFillCharSet;
    }

    return settings;
  }

  /**
   * Set settings change callback
   * @param {Function} callback - Called when settings change
   */
  setOnSettingsChange(callback) {
    this.onSettingsChange = callback;
  }

  /**
   * Show video controls
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  /**
   * Hide video controls
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Set video information display
   * @param {Object} info - Video metadata
   */
  setVideoInfo(info) {
    if (!this.videoInfoElement) return;

    const duration = this._formatDuration(info.duration);
    const dimensions = `${info.width}x${info.height}`;
    const fps = Math.round(info.fps);

    // Set initial audio state based on whether video has audio
    this.includeAudio = info.hasAudio;

    this.videoInfoElement.innerHTML = `
      <div class="video-info-item">
        <span class="video-info-label">Duration:</span>
        <span class="video-info-value">${duration}</span>
      </div>
      <div class="video-info-item">
        <span class="video-info-label">Dimensions:</span>
        <span class="video-info-value">${dimensions}</span>
      </div>
      <div class="video-info-item">
        <span class="video-info-label">FPS:</span>
        <span class="video-info-value">${fps}</span>
      </div>
      <div class="video-info-item audio-toggle-item">
        <span class="video-info-label">Include Audio:</span>
        <label class="toggle-switch">
          <input type="checkbox" id="audioToggle" ${info.hasAudio ? 'checked' : ''} ${!info.hasAudio ? 'disabled' : ''}>
          <span class="toggle-slider"></span>
        </label>
        ${!info.hasAudio ? '<span class="no-audio-hint">(No audio in source)</span>' : ''}
      </div>
    `;

    // Setup audio toggle listener
    this.audioToggle = document.getElementById('audioToggle');
    if (this.audioToggle) {
      this.audioToggle.addEventListener('change', (e) => {
        this.includeAudio = e.target.checked;
      });
    }
  }

  /**
   * Set progress bar state
   * @param {string} phase - Current phase (extracting, converting, encoding)
   * @param {number} progress - Progress value (0-1)
   */
  setProgress(phase, progress) {
    if (!this.progressBar || !this.progressText) return;

    // Update progress bar
    const percentage = Math.round(progress * 100);
    this.progressBar.style.width = `${percentage}%`;

    // Set phase-specific color
    const colors = {
      extracting: '#4caf50',
      converting: '#9c27b0',
      encoding: '#ff9800'
    };
    this.progressBar.style.backgroundColor = colors[phase] || '#2196f3';

    // Update text
    const phaseText = phase.charAt(0).toUpperCase() + phase.slice(1);
    this.progressText.textContent = `${phaseText}: ${percentage}%`;
  }

  /**
   * Setup preview slider
   * @param {number} duration - Video duration in seconds
   * @param {Function} onChange - Callback when slider changes
   */
  setupPreviewSlider(duration, onChange) {
    if (!this.previewSlider) return;

    this.currentDuration = duration;
    this.onSliderChange = onChange;

    this.previewSlider.min = '0';
    this.previewSlider.max = duration.toString();
    this.previewSlider.step = '0.1';
    this.previewSlider.value = '0';

    this._updateTimeDisplay(0);
  }

  /**
   * Set cancel button state
   * @param {boolean} enabled - Whether cancel is enabled
   * @param {Function} onClick - Click handler
   */
  setCancelEnabled(enabled, onClick) {
    if (!this.cancelButton) return;

    if (enabled) {
      this.cancelButton.disabled = false;
      this.cancelButton.style.display = 'inline-block';
      this.cancelButton.onclick = onClick;
    } else {
      this.cancelButton.disabled = true;
      this.cancelButton.style.display = 'none';
      this.cancelButton.onclick = null;
    }
  }

  /**
   * Set convert button state
   * @param {boolean} enabled - Whether button is enabled
   * @param {Function} onClick - Click handler
   */
  setConvertEnabled(enabled, onClick) {
    if (!this.convertButton) return;

    this.convertButton.disabled = !enabled;
    if (onClick) {
      this.convertButton.onclick = onClick;
    }
  }

  /**
   * Reset all controls to initial state
   */
  reset() {
    if (this.videoInfoElement) {
      this.videoInfoElement.innerHTML = '';
    }

    if (this.previewSlider) {
      this.previewSlider.value = '0';
      this.previewSlider.min = '0';
      this.previewSlider.max = '0';
    }

    if (this.previewTimeDisplay) {
      this.previewTimeDisplay.textContent = '0:00';
    }

    if (this.progressBar) {
      this.progressBar.style.width = '0%';
    }

    if (this.progressText) {
      this.progressText.textContent = '';
    }

    this.setCancelEnabled(false, null);
    this.setConvertEnabled(false, null);
    this.currentDuration = 0;
    this.onSliderChange = null;
  }

  /**
   * Update time display
   * @private
   * @param {number} time - Time in seconds
   */
  _updateTimeDisplay(time) {
    if (!this.previewTimeDisplay) return;

    const formatted = this._formatDuration(time);
    const total = this._formatDuration(this.currentDuration);
    this.previewTimeDisplay.textContent = `${formatted} / ${total}`;
  }

  /**
   * Format duration as MM:SS or HH:MM:SS
   * @private
   * @param {number} seconds - Duration in seconds
   * @returns {string}
   */
  _formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
}
