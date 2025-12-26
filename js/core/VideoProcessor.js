/**
 * VideoProcessor - Complete video processing pipeline
 * Video → Frames → ASCII Frames → MP4
 */
import EventBus from '../utils/EventBus.js';
import config from '../config.js';

export default class VideoProcessor {
  constructor(ffmpegManager, asciiEngine, canvasRenderer) {
    this.ffmpegManager = ffmpegManager;
    this.asciiEngine = asciiEngine;
    this.canvasRenderer = canvasRenderer;
    this.currentVideoFile = null;
    this.videoInfo = null;
    this.previewFrameData = null;
    this.isCancelled = false;
  }

  /**
   * Load video and extract metadata
   * @param {File} file - Video file
   * @returns {Promise<Object>} - Video metadata
   */
  async loadVideo(file) {
    try {
      this.currentVideoFile = file;
      this.isCancelled = false;

      // Get video information
      this.videoInfo = await this.ffmpegManager.getVideoInfo(file);

      // Extract first frame for preview
      this.previewFrameData = await this.ffmpegManager.extractFrame(file, 0);

      EventBus.emit('video:loaded', {
        videoInfo: this.videoInfo,
        previewFrame: this.previewFrameData
      });

      return this.videoInfo;
    } catch (error) {
      EventBus.emit('video:load-error', { error });
      throw error;
    }
  }

  /**
   * Get frame at specific time for preview
   * @param {number} time - Time in seconds
   * @returns {Promise<ImageData>}
   */
  async getPreviewFrame(time) {
    if (!this.currentVideoFile) {
      throw new Error('No video loaded');
    }

    try {
      const frameData = await this.ffmpegManager.extractFrame(this.currentVideoFile, time);
      this.previewFrameData = frameData;

      EventBus.emit('video:preview-frame-loaded', { frameData, time });

      return frameData;
    } catch (error) {
      EventBus.emit('video:preview-error', { error });
      throw error;
    }
  }

  /**
   * Convert preview frame to ASCII
   * @param {Object} options - Conversion options
   * @returns {HTMLCanvasElement}
   */
  convertPreviewFrame(options) {
    if (!this.previewFrameData) {
      throw new Error('No preview frame available');
    }

    try {
      // Convert to ASCII
      const asciiData = this.asciiEngine.convert(this.previewFrameData, options);

      // Render to canvas
      const canvas = this.canvasRenderer.render(asciiData, options.renderOptions);

      EventBus.emit('video:preview-ready', { canvas });

      return canvas;
    } catch (error) {
      EventBus.emit('video:preview-error', { error });
      throw error;
    }
  }

  /**
   * Process complete video: Extract → Convert → Encode
   * @param {Object} options - Processing options
   * @returns {Promise<Blob>} - MP4 video blob
   */
  async processVideo(options) {
    if (!this.currentVideoFile) {
      throw new Error('No video loaded');
    }

    this.isCancelled = false;

    try {
      EventBus.emit('video:process-start', {});

      // Use original video FPS by default to maintain audio sync
      // Only use targetFPS if explicitly requested and it's lower than original
      const originalFps = this.videoInfo.fps || 30;
      let targetFps = originalFps;

      // Allow downsampling to targetFPS if it's lower (for performance)
      // but never upsample as that doesn't help
      if (options.fps && options.fps < originalFps) {
        targetFps = options.fps;
      } else if (config.video.targetFPS && config.video.targetFPS < originalFps) {
        targetFps = config.video.targetFPS;
      }

      const maxWidth = options.width || config.video.maxFrameWidth;

      // Phase 1: Extract frames
      EventBus.emit('video:progress', {
        phase: 'extracting',
        progress: 0,
        message: 'Extracting video frames...'
      });

      const frameCount = await this.ffmpegManager.extractAllFrames(
        this.currentVideoFile,
        targetFps,
        maxWidth,
        (progress) => {
          if (this.isCancelled) return;
          EventBus.emit('video:progress', {
            phase: 'extracting',
            progress: progress,
            message: `Extracting frames: ${Math.round(progress * 100)}%`
          });
        }
      );

      if (this.isCancelled) {
        await this._handleCancellation();
        return null;
      }

      // Phase 2: Convert frames
      EventBus.emit('video:progress', {
        phase: 'converting',
        progress: 0,
        message: 'Converting frames to ASCII...'
      });

      for (let i = 1; i <= frameCount; i++) {
        if (this.isCancelled) {
          await this._handleCancellation();
          return null;
        }

        // Get frame
        const frameData = await this.ffmpegManager.getFrame(i);

        // Convert to ASCII
        const asciiData = this.asciiEngine.convert(frameData, options);

        // Render to canvas
        const canvas = this.canvasRenderer.render(asciiData, options.renderOptions);

        // Convert canvas to blob
        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/png');
        });

        // Write converted frame
        await this.ffmpegManager.writeConvertedFrame(i, blob);

        // Clear canvas to manage memory
        this.canvasRenderer.clear();

        // Emit progress
        const progress = i / frameCount;
        EventBus.emit('video:progress', {
          phase: 'converting',
          progress: progress,
          message: `Converting frame ${i}/${frameCount}`
        });
      }

      if (this.isCancelled) {
        await this._handleCancellation();
        return null;
      }

      // Phase 3: Extract audio (if present and user wants to include it)
      let hasAudio = false;
      const includeAudio = options.includeAudio !== false; // Default to true
      if (this.videoInfo.hasAudio && includeAudio) {
        try {
          hasAudio = await this.ffmpegManager.extractAudio(this.currentVideoFile);
        } catch (e) {
          console.warn('Failed to extract audio, continuing without it');
        }
      }

      // Phase 4: Encode to MP4
      EventBus.emit('video:progress', {
        phase: 'encoding',
        progress: 0,
        message: 'Encoding final video...'
      });

      const videoBlob = await this.ffmpegManager.encodeToMP4(
        targetFps,
        hasAudio,
        (progress) => {
          if (this.isCancelled) return;
          EventBus.emit('video:progress', {
            phase: 'encoding',
            progress: progress,
            message: `Encoding video: ${Math.round(progress * 100)}%`
          });
        }
      );

      if (this.isCancelled) {
        await this._handleCancellation();
        return null;
      }

      // Cleanup
      await this.ffmpegManager.cleanup();

      EventBus.emit('video:process-complete', { videoBlob });

      return videoBlob;
    } catch (error) {
      // Cleanup on error
      try {
        await this.ffmpegManager.cleanup();
      } catch (e) {
        // Ignore cleanup errors
      }

      EventBus.emit('video:process-error', { error });
      throw error;
    }
  }

  /**
   * Cancel video processing
   */
  cancel() {
    this.isCancelled = true;
  }

  /**
   * Handle cancellation
   * @private
   */
  async _handleCancellation() {
    try {
      await this.ffmpegManager.cleanup();
    } catch (e) {
      // Ignore cleanup errors
    }
    EventBus.emit('video:process-cancelled', {});
  }

  /**
   * Get current video info
   * @returns {Object|null}
   */
  getVideoInfo() {
    return this.videoInfo;
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.currentVideoFile = null;
    this.videoInfo = null;
    this.previewFrameData = null;
    this.isCancelled = false;
    this.canvasRenderer.clear();
  }
}
