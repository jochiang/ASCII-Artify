/**
 * ControlPanel - Manages settings UI controls
 */
import EventBus from '../utils/EventBus.js';
import config from '../config.js';

export default class ControlPanel {
  constructor() {
    this.widthSlider = document.getElementById('widthSlider');
    this.widthValue = document.getElementById('widthValue');
    this.charSetInput = document.getElementById('charSetInput');
    this.colorModeSelect = document.getElementById('colorModeSelect');
    this.converterSelect = document.getElementById('converterSelect');
    this.convertBtn = document.getElementById('convertBtn');
    this.exportPngBtn = document.getElementById('exportPngBtn');
    this.exportTextBtn = document.getElementById('exportTextBtn');

    // Edge detection controls
    this.edgeControls = document.getElementById('edgeControls');
    this.cannyLowThreshold = document.getElementById('cannyLowThreshold');
    this.cannyLowValue = document.getElementById('cannyLowValue');
    this.cannyHighThreshold = document.getElementById('cannyHighThreshold');
    this.cannyHighValue = document.getElementById('cannyHighValue');
    this.edgeCharSetInput = document.getElementById('edgeCharSetInput');
    this.fillCharSetInput = document.getElementById('fillCharSetInput');

    // Saturation boost controls
    this.saturationControls = document.getElementById('saturationControls');
    this.saturationSlider = document.getElementById('saturationSlider');
    this.saturationValue = document.getElementById('saturationValue');

    this.init();
  }

  /**
   * Initialize event listeners
   */
  init() {
    // Width slider
    this.widthSlider.addEventListener('input', (e) => {
      this.widthValue.textContent = e.target.value;
      EventBus.emit('settings:changed', this.getSettings());
    });

    // Character set input
    this.charSetInput.addEventListener('input', () => {
      EventBus.emit('settings:changed', this.getSettings());
    });

    // Color mode select
    this.colorModeSelect.addEventListener('change', () => {
      this.toggleSaturationControls(this.colorModeSelect.value);
      EventBus.emit('settings:changed', this.getSettings());
    });

    // Saturation slider
    this.saturationSlider.addEventListener('input', (e) => {
      this.saturationValue.textContent = `${e.target.value}x`;
      EventBus.emit('settings:changed', this.getSettings());
    });

    // Converter select
    this.converterSelect.addEventListener('change', (e) => {
      this.toggleEdgeControls(e.target.value);
      EventBus.emit('converter:selected', { converter: e.target.value });
    });

    // Edge detection controls
    this.cannyLowThreshold.addEventListener('input', (e) => {
      this.cannyLowValue.textContent = e.target.value;
      EventBus.emit('settings:changed', this.getSettings());
    });

    this.cannyHighThreshold.addEventListener('input', (e) => {
      this.cannyHighValue.textContent = e.target.value;
      EventBus.emit('settings:changed', this.getSettings());
    });

    this.edgeCharSetInput.addEventListener('input', () => {
      EventBus.emit('settings:changed', this.getSettings());
    });

    this.fillCharSetInput.addEventListener('input', () => {
      EventBus.emit('settings:changed', this.getSettings());
    });

    // Convert button
    this.convertBtn.addEventListener('click', () => {
      EventBus.emit('action:convert', this.getSettings());
    });

    // Export PNG button
    this.exportPngBtn.addEventListener('click', () => {
      EventBus.emit('action:export-png');
    });

    // Export Text button
    this.exportTextBtn.addEventListener('click', () => {
      EventBus.emit('action:export-text');
    });

    // Listen for file selection to enable convert button
    EventBus.on('file:selected', () => {
      this.convertBtn.disabled = false;
    });

    // Listen for conversion complete to enable export buttons
    EventBus.on('processing:complete', () => {
      this.exportPngBtn.disabled = false;
      this.exportTextBtn.disabled = false;
    });

    EventBus.on('reprocessing:complete', () => {
      this.exportPngBtn.disabled = false;
      this.exportTextBtn.disabled = false;
    });
  }

  /**
   * Get current settings
   * @returns {Object}
   */
  getSettings() {
    const settings = {
      width: parseInt(this.widthSlider.value),
      charSet: this.charSetInput.value || config.ascii.defaultCharSet,
      colorMode: this.colorModeSelect.value,
      converter: this.converterSelect.value,
      saturationBoost: parseFloat(this.saturationSlider.value)
    };

    // Add edge detection settings if edge converter is selected
    if (this.converterSelect.value === 'edge') {
      settings.cannyLowThreshold = parseInt(this.cannyLowThreshold.value);
      settings.cannyHighThreshold = parseInt(this.cannyHighThreshold.value);
      settings.edgeCharSet = this.edgeCharSetInput.value || config.ascii.edgeDetection.defaultEdgeCharSet;
      settings.fillCharSet = this.fillCharSetInput.value || config.ascii.edgeDetection.defaultFillCharSet;
    }

    return settings;
  }

  /**
   * Set settings
   * @param {Object} settings
   */
  setSettings(settings) {
    if (settings.width !== undefined) {
      this.widthSlider.value = settings.width;
      this.widthValue.textContent = settings.width;
    }

    if (settings.charSet !== undefined) {
      this.charSetInput.value = settings.charSet;
    }

    if (settings.colorMode !== undefined) {
      this.colorModeSelect.value = settings.colorMode;
    }

    if (settings.converter !== undefined) {
      this.converterSelect.value = settings.converter;
    }

    EventBus.emit('settings:changed', this.getSettings());
  }

  /**
   * Populate converter options
   * @param {Array} converters - Array of { name, description }
   */
  setConverterOptions(converters) {
    this.converterSelect.innerHTML = '';

    converters.forEach(({ name, description }) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = `${name.charAt(0).toUpperCase() + name.slice(1)} - ${description}`;
      this.converterSelect.appendChild(option);
    });
  }

  /**
   * Enable/disable controls
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.widthSlider.disabled = !enabled;
    this.charSetInput.disabled = !enabled;
    this.colorModeSelect.disabled = !enabled;
    this.converterSelect.disabled = !enabled;
  }

  /**
   * Enable/disable convert button
   * @param {boolean} enabled
   */
  setConvertEnabled(enabled) {
    this.convertBtn.disabled = !enabled;
  }

  /**
   * Enable/disable export buttons
   * @param {boolean} enabled
   */
  setExportEnabled(enabled) {
    this.exportPngBtn.disabled = !enabled;
    this.exportTextBtn.disabled = !enabled;
  }

  /**
   * Set loading state
   * @param {boolean} loading
   */
  setLoading(loading) {
    if (loading) {
      this.convertBtn.textContent = 'Converting...';
      this.convertBtn.disabled = true;
      this.setEnabled(false);
    } else {
      this.convertBtn.textContent = 'Convert to ASCII';
      this.convertBtn.disabled = false;
      this.setEnabled(true);
    }
  }

  /**
   * Toggle edge detection controls visibility
   * @param {string} converter - Selected converter type
   */
  toggleEdgeControls(converter) {
    if (converter === 'edge') {
      this.edgeControls.style.display = 'block';
    } else {
      this.edgeControls.style.display = 'none';
    }
  }

  /**
   * Toggle saturation controls visibility
   * @param {string} colorMode - Selected color mode
   */
  toggleSaturationControls(colorMode) {
    if (colorMode === 'color') {
      this.saturationControls.style.display = 'block';
    } else {
      this.saturationControls.style.display = 'none';
    }
  }

  /**
   * Show control panel
   */
  show() {
    const controlSection = document.querySelector('.control-section');
    if (controlSection) {
      controlSection.style.display = 'block';
    }
  }

  /**
   * Hide control panel
   */
  hide() {
    const controlSection = document.querySelector('.control-section');
    if (controlSection) {
      controlSection.style.display = 'none';
    }
  }
}
