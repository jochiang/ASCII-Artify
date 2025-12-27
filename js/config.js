/**
 * Configuration constants for ASCII Artify
 */
export default {
  // ASCII conversion settings
  ascii: {
    defaultCharSet: ' .:-=+*#%@',
    defaultWidth: 100,
    minWidth: 20,
    maxWidth: 300,
    colorModes: ['monochrome', 'color'],
    defaultSaturationBoost: 1.0,  // 1.0 = no boost, 2.0 = double saturation
    minSaturationBoost: 0.5,
    maxSaturationBoost: 2.0,
    defaultLuminanceBoost: 1.0,  // 1.0 = no boost
    minLuminanceBoost: 0.5,
    maxLuminanceBoost: 2.0,

    // Edge detection converter settings
    edgeDetection: {
      defaultEdgeCharSet: 'ILJTFYVCXZAHKNMBDPQRUWG@#%&',
      defaultFillCharSet: ' .`\',;:_-~"<>+*^ilcstfvoabdeghknpqruymwxzj',
      defaultCannyLowThreshold: 50,
      defaultCannyHighThreshold: 150,
      minThreshold: 0,
      maxThreshold: 255
    }
  },

  // Canvas rendering settings
  canvas: {
    fontFamily: 'Courier New',
    fontSize: 10,
    lineHeight: 1.2,
    backgroundColor: '#000000',
    foregroundColor: '#ffffff'
  },

  // Video processing settings (for future phases)
  video: {
    maxFrameWidth: 200,
    targetFPS: 24,
    chunkSize: 30,        // Frames per chunk
    workerCount: 4        // Parallel workers
  },

  // FFMPEG.wasm configuration - using local files to avoid CORS issues
  // Note: Requires server with CORS headers for SharedArrayBuffer support
  // Use server.py instead of python -m http.server
  ffmpeg: {
    coreURL: './lib/ffmpeg/ffmpeg-core.js',
    wasmURL: './lib/ffmpeg/ffmpeg-core.wasm',
    workerURL: './lib/ffmpeg/worker.js'
  },

  // Supported file types
  supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  supportedVideoFormats: ['video/mp4', 'video/webm', 'video/quicktime'],

  // UI settings
  ui: {
    dragDropText: 'Drag & drop an image here or click to select',
    maxPreviewWidth: 800,
    maxPreviewHeight: 600
  }
};
