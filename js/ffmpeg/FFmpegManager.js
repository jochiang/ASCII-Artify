/**
 * FFmpegManager - Singleton wrapper for FFMPEG.wasm
 * Handles video frame extraction, audio extraction, and MP4 encoding
 */
import EventBus from '../utils/EventBus.js';
import config from '../config.js';

class FFmpegManager {
  constructor() {
    this.ffmpeg = null;
    this.FFmpeg = null;
    this.fetchFile = null;
    this.isLoaded = false;
    this.isLoading = false;
  }

  /**
   * Lazy-load FFMPEG.wasm from local files
   * @returns {Promise<void>}
   */
  async load() {
    if (this.isLoaded) {
      return;
    }

    if (this.isLoading) {
      // Wait for existing load to complete
      return new Promise((resolve, reject) => {
        const checkLoaded = () => {
          if (this.isLoaded) {
            resolve();
          } else if (!this.isLoading) {
            reject(new Error('FFMPEG loading failed'));
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }

    try {
      this.isLoading = true;
      EventBus.emit('ffmpeg:loading', {});

      // Import FFMPEG modules from local files
      const ffmpegModule = await import('../../lib/ffmpeg/index.js');
      const utilModule = await import('../../lib/ffmpeg/util-index.js');

      this.FFmpeg = ffmpegModule.FFmpeg;
      this.fetchFile = utilModule.fetchFile;

      // Create FFMPEG instance
      this.ffmpeg = new this.FFmpeg();

      // Load FFMPEG core from local files
      // classWorkerURL is needed to avoid cross-origin worker issues
      // Convert relative paths to absolute URLs to avoid path resolution issues in workers
      const baseURL = new URL('.', window.location.href).href;
      await this.ffmpeg.load({
        coreURL: new URL(config.ffmpeg.coreURL, baseURL).href,
        wasmURL: new URL(config.ffmpeg.wasmURL, baseURL).href,
        classWorkerURL: new URL(config.ffmpeg.workerURL, baseURL).href
      });

      this.isLoaded = true;
      this.isLoading = false;
      EventBus.emit('ffmpeg:loaded', {});
    } catch (error) {
      this.isLoading = false;
      EventBus.emit('ffmpeg:error', { error });
      throw new Error(`Failed to load FFMPEG: ${error.message}`);
    }
  }

  /**
   * Get video information (duration, fps, dimensions)
   * @param {File} file - Video file
   * @returns {Promise<Object>} - Video metadata
   */
  async getVideoInfo(file) {
    await this.load();

    try {
      // Write video to virtual filesystem
      await this.ffmpeg.writeFile('input.mp4', await this.fetchFile(file));

      // Get video information using ffprobe-like command
      // Extract metadata by running ffmpeg with -i flag
      let duration = 0;
      let fps = 0;
      let width = 0;
      let height = 0;
      let hasAudio = false;

      // Listen to log messages to extract metadata
      this.ffmpeg.on('log', ({ message }) => {
        // Parse duration: Duration: 00:00:10.05
        const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d+)/);
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          const seconds = parseFloat(durationMatch[3]);
          duration = hours * 3600 + minutes * 60 + seconds;
        }

        // Parse fps: 30 fps, 24 fps, etc.
        const fpsMatch = message.match(/(\d+\.?\d*)\s*fps/);
        if (fpsMatch) {
          fps = parseFloat(fpsMatch[1]);
        }

        // Parse dimensions: 1920x1080
        const dimMatch = message.match(/(\d+)x(\d+)/);
        if (dimMatch) {
          width = parseInt(dimMatch[1]);
          height = parseInt(dimMatch[2]);
        }

        // Check for audio stream
        if (message.includes('Audio:')) {
          hasAudio = true;
        }
      });

      // Run ffmpeg to get info (will fail but logs contain metadata)
      try {
        await this.ffmpeg.exec(['-i', 'input.mp4']);
      } catch (e) {
        // Expected to fail, we just need the logs
      }

      // Remove log listener
      this.ffmpeg.off('log');

      return {
        duration,
        fps: fps || 30, // Default to 30 if not detected
        width,
        height,
        hasAudio
      };
    } catch (error) {
      throw new Error(`Failed to get video info: ${error.message}`);
    }
  }

  /**
   * Extract a single frame at specific time
   * @param {File} file - Video file
   * @param {number} time - Time in seconds
   * @returns {Promise<ImageData>}
   */
  async extractFrame(file, time) {
    await this.load();

    try {
      // Write video to virtual filesystem if not already there
      const fileList = await this.ffmpeg.listDir('/');
      if (!fileList.some(f => f.name === 'input.mp4')) {
        await this.ffmpeg.writeFile('input.mp4', await this.fetchFile(file));
      }

      // Extract frame at specific time
      await this.ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', time.toString(),
        '-vframes', '1',
        '-f', 'image2',
        'preview_frame.png'
      ]);

      // Read the frame
      const data = await this.ffmpeg.readFile('preview_frame.png');

      // Convert to ImageData
      const blob = new Blob([data.buffer], { type: 'image/png' });
      const imageData = await this._blobToImageData(blob);

      // Cleanup
      await this.ffmpeg.deleteFile('preview_frame.png');

      return imageData;
    } catch (error) {
      throw new Error(`Failed to extract frame: ${error.message}`);
    }
  }

  /**
   * Extract all frames from video
   * @param {File} file - Video file
   * @param {number} fps - Target FPS for extraction
   * @param {number} maxWidth - Maximum frame width
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<number>} - Number of frames extracted
   */
  async extractAllFrames(file, fps, maxWidth, onProgress) {
    await this.load();

    try {
      // Write video to virtual filesystem if not already there
      const fileList = await this.ffmpeg.listDir('/');
      if (!fileList.some(f => f.name === 'input.mp4')) {
        await this.ffmpeg.writeFile('input.mp4', await this.fetchFile(file));
      }

      // Track progress
      let frameCount = 0;
      this.ffmpeg.on('progress', ({ progress }) => {
        if (onProgress) {
          onProgress(progress);
        }
      });

      // Extract all frames with scaling
      await this.ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', `scale=${maxWidth}:-1`,
        '-r', fps.toString(),
        'frame_%05d.png'
      ]);

      // Count extracted frames
      const files = await this.ffmpeg.listDir('/');
      frameCount = files.filter(f => f.name.startsWith('frame_')).length;

      // Remove progress listener
      this.ffmpeg.off('progress');

      return frameCount;
    } catch (error) {
      this.ffmpeg.off('progress');
      throw new Error(`Failed to extract frames: ${error.message}`);
    }
  }

  /**
   * Get a specific frame as ImageData
   * @param {number} index - Frame index (1-based)
   * @returns {Promise<ImageData>}
   */
  async getFrame(index) {
    await this.load();

    try {
      const filename = `frame_${index.toString().padStart(5, '0')}.png`;
      const data = await this.ffmpeg.readFile(filename);

      // Convert to ImageData
      const blob = new Blob([data.buffer], { type: 'image/png' });
      const imageData = await this._blobToImageData(blob);

      return imageData;
    } catch (error) {
      throw new Error(`Failed to get frame ${index}: ${error.message}`);
    }
  }

  /**
   * Extract audio track from video
   * @param {File} file - Video file
   * @returns {Promise<boolean>} - True if audio extracted successfully
   */
  async extractAudio(file) {
    await this.load();

    try {
      // Write video to virtual filesystem if not already there
      const fileList = await this.ffmpeg.listDir('/');
      if (!fileList.some(f => f.name === 'input.mp4')) {
        await this.ffmpeg.writeFile('input.mp4', await this.fetchFile(file));
      }

      // Extract audio
      await this.ffmpeg.exec([
        '-i', 'input.mp4',
        '-vn',
        '-acodec', 'copy',
        'audio.aac'
      ]);

      return true;
    } catch (error) {
      // Video might not have audio
      console.warn('No audio track found or failed to extract:', error.message);
      return false;
    }
  }

  /**
   * Write a converted frame as PNG
   * @param {number} index - Frame index (1-based)
   * @param {Blob} pngBlob - PNG blob
   * @returns {Promise<void>}
   */
  async writeConvertedFrame(index, pngBlob) {
    await this.load();

    try {
      const filename = `ascii_${index.toString().padStart(5, '0')}.png`;
      const arrayBuffer = await pngBlob.arrayBuffer();
      await this.ffmpeg.writeFile(filename, new Uint8Array(arrayBuffer));
    } catch (error) {
      throw new Error(`Failed to write frame ${index}: ${error.message}`);
    }
  }

  /**
   * Encode frames to MP4 video
   * @param {number} fps - Target FPS
   * @param {boolean} hasAudio - Whether to include audio
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Blob>} - MP4 video blob
   */
  async encodeToMP4(fps, hasAudio, onProgress) {
    await this.load();

    try {
      // Track progress
      this.ffmpeg.on('progress', ({ progress }) => {
        if (onProgress) {
          onProgress(progress);
        }
      });

      // List files to verify frames exist
      const files = await this.ffmpeg.listDir('/');
      const asciiFrames = files.filter(f => f.name.startsWith('ascii_')).sort((a, b) => a.name.localeCompare(b.name));
      console.log(`Found ${asciiFrames.length} ASCII frames to encode`);

      if (asciiFrames.length > 0) {
        console.log('First frame:', asciiFrames[0].name);
        console.log('Last frame:', asciiFrames[asciiFrames.length - 1].name);
      }

      if (asciiFrames.length === 0) {
        throw new Error('No ASCII frames found to encode');
      }

      // Check if frames are numbered correctly starting from 1
      const firstFrameNum = parseInt(asciiFrames[0].name.match(/\d+/)[0]);
      console.log('First frame number:', firstFrameNum);

      // Build ffmpeg command
      // Use -start_number if frames don't start at 1
      const cmd = [
        '-framerate', fps.toString()
      ];

      if (firstFrameNum !== 1) {
        cmd.push('-start_number', firstFrameNum.toString());
      }

      // Add video input
      cmd.push('-i', 'ascii_%05d.png');

      // Add audio input if available (must come before codec settings)
      let includeAudio = false;
      if (hasAudio) {
        const hasAudioFile = files.some(f => f.name === 'audio.aac');
        if (hasAudioFile) {
          cmd.push('-i', 'audio.aac');
          includeAudio = true;
        } else {
          console.warn('Audio file not found, encoding without audio');
        }
      }

      // Video codec settings
      // Use bt709 colorspace with sRGB transfer curve and full color range
      cmd.push(
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-colorspace', 'bt709',
        '-color_primaries', 'bt709',
        '-color_trc', 'iec61966-2-1',
        '-color_range', 'pc'
      );

      // Audio codec settings (if audio is included)
      if (includeAudio) {
        cmd.push('-c:a', 'aac', '-shortest');
      }

      cmd.push('-y', 'output.mp4');

      console.log('Encoding with command:', cmd.join(' '));

      // Log any ffmpeg messages
      const logHandler = ({ message }) => {
        console.log('FFmpeg:', message);
      };
      this.ffmpeg.on('log', logHandler);

      // Encode video
      const exitCode = await this.ffmpeg.exec(cmd);
      console.log('FFmpeg exit code:', exitCode);

      this.ffmpeg.off('log', logHandler);

      // Check if output file was created
      const outputFiles = await this.ffmpeg.listDir('/');
      const outputExists = outputFiles.some(f => f.name === 'output.mp4');

      if (!outputExists) {
        throw new Error('Output file was not created');
      }

      // Read output file
      const data = await this.ffmpeg.readFile('output.mp4');
      const blob = new Blob([data.buffer], { type: 'video/mp4' });

      console.log('Output video size:', blob.size, 'bytes');

      // Remove progress listener
      this.ffmpeg.off('progress');

      return blob;
    } catch (error) {
      this.ffmpeg.off('progress');
      console.error('Encoding error details:', error);
      throw new Error(`Failed to encode video: ${error?.message || error}`);
    }
  }

  /**
   * Clean up virtual filesystem
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (!this.isLoaded) {
      return;
    }

    try {
      const files = await this.ffmpeg.listDir('/');

      // Delete all files
      for (const file of files) {
        if (file.isDir) continue;
        try {
          await this.ffmpeg.deleteFile(file.name);
        } catch (e) {
          // Ignore errors
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup FFMPEG filesystem:', error);
    }
  }

  /**
   * Convert blob to ImageData
   * @private
   * @param {Blob} blob - Image blob
   * @returns {Promise<ImageData>}
   */
  async _blobToImageData(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(imageData);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image from blob'));
      };

      img.src = url;
    });
  }
}

// Export singleton instance
export default new FFmpegManager();
