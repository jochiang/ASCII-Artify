/**
 * ASCII Artify - Main application bootstrap
 * Initializes and wires together all modules
 */

// Core modules
import AsciiEngine from './core/AsciiEngine.js';
import ImageProcessor from './core/ImageProcessor.js';
import CanvasRenderer from './core/CanvasRenderer.js';
import VideoProcessor from './core/VideoProcessor.js';

// Converters
import DensityConverter from './converters/DensityConverter.js';
import EdgeDetectionConverter from './converters/EdgeDetectionConverter.js';

// UI modules
import InputHandler from './ui/InputHandler.js';
import ControlPanel from './ui/ControlPanel.js';
import UIController from './ui/UIController.js';
import ExportHandler from './ui/ExportHandler.js';
import VideoControls from './ui/VideoControls.js';

// FFmpeg
import FFmpegManager from './ffmpeg/FFmpegManager.js';

// Utils
import EventBus from './utils/EventBus.js';
import config from './config.js';

/**
 * Application class
 */
class AsciiArtifyApp {
  constructor() {
    this.asciiEngine = null;
    this.imageProcessor = null;
    this.videoProcessor = null;
    this.canvasRenderer = null;
    this.inputHandler = null;
    this.controlPanel = null;
    this.videoControls = null;
    this.uiController = null;
    this.exportHandler = null;
  }

  /**
   * Initialize the application
   */
  init() {
    console.log('Initializing ASCII Artify...');

    try {
      // Initialize core components
      this.initCore();

      // Initialize UI components
      this.initUI();

      // Set up converters
      this.setupConverters();

      // Set initial state
      this.setInitialState();

      console.log('ASCII Artify initialized successfully!');
      this.showWelcomeMessage();
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showErrorMessage('Failed to initialize application: ' + error.message);
    }
  }

  /**
   * Initialize core components
   */
  initCore() {
    // Create ASCII engine
    this.asciiEngine = new AsciiEngine();

    // Create canvas renderer
    this.canvasRenderer = new CanvasRenderer();

    // Create image processor
    this.imageProcessor = new ImageProcessor(this.asciiEngine, this.canvasRenderer);

    // Create video processor
    this.videoProcessor = new VideoProcessor(FFmpegManager, this.asciiEngine, this.canvasRenderer);
  }

  /**
   * Initialize UI components
   */
  initUI() {
    // Create input handler
    this.inputHandler = new InputHandler('fileInput', 'dropZone');

    // Create control panel
    this.controlPanel = new ControlPanel();

    // Create video controls
    this.videoControls = new VideoControls();
    this.videoControls.init();

    // Create UI controller
    this.uiController = new UIController(
      this.inputHandler,
      this.controlPanel,
      this.imageProcessor,
      this.videoProcessor,
      this.videoControls
    );

    // Create export handler
    this.exportHandler = new ExportHandler(this.imageProcessor, this.canvasRenderer);
  }

  /**
   * Set up converters
   */
  setupConverters() {
    // Register converters
    this.asciiEngine.registerConverter('density', new DensityConverter());
    this.asciiEngine.registerConverter('edge', new EdgeDetectionConverter());

    // Set default converter
    this.asciiEngine.setConverter('density');

    // Update control panel with available converters
    const availableConverters = this.asciiEngine.getAvailableConverters();
    this.controlPanel.setConverterOptions(availableConverters);

    // Listen for converter selection changes
    EventBus.on('converter:selected', (data) => {
      this.asciiEngine.setConverter(data.converter);
    });
  }

  /**
   * Set initial state
   */
  setInitialState() {
    // Set default settings
    this.controlPanel.setSettings({
      width: config.ascii.defaultWidth,
      charSet: config.ascii.defaultCharSet,
      colorMode: 'monochrome',
      converter: 'density'
    });

    // Disable export buttons initially
    this.controlPanel.setExportEnabled(false);
  }

  /**
   * Show welcome message
   */
  showWelcomeMessage() {
    const message = document.createElement('div');
    message.className = 'welcome-message';
    message.innerHTML = `
      <h2>Welcome to ASCII Artify!</h2>
      <p>Upload an image to get started.</p>
    `;
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--surface);
      padding: 30px;
      border-radius: 12px;
      border: 1px solid var(--border);
      text-align: center;
      z-index: 999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    document.body.appendChild(message);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      message.style.transition = 'opacity 0.5s ease';
      message.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(message);
      }, 500);
    }, 2000);
  }

  /**
   * Show error message
   * @param {string} message
   */
  showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--error);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    document.body.appendChild(errorDiv);

    setTimeout(() => {
      document.body.removeChild(errorDiv);
    }, 5000);
  }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new AsciiArtifyApp();
    app.init();
  });
} else {
  const app = new AsciiArtifyApp();
  app.init();
}
