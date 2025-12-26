# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ASCII Artify - A client-side web application that converts images and videos to ASCII art. Built with vanilla-adjacent JavaScript (pure JS + FFMPEG.wasm for video). Features two conversion algorithms: density-based and edge detection-based ASCII conversion.

## Development Commands

### Local Testing
```bash
# Start local HTTP server with CORS headers (required for video/FFMPEG.wasm)
python server.py

# Then open http://localhost:8080 in browser
```

**Important**: Use `server.py` instead of `python -m http.server` because FFMPEG.wasm requires `SharedArrayBuffer`, which needs specific CORS headers:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: credentialless`

### Deployment
```bash
# Deploy to GitHub Pages (after pushing to GitHub)
# Enable Pages in repo settings → Source: main branch, root directory
# Note: Video features may not work on GitHub Pages due to CORS header requirements
```

## Architecture

### File Structure
```
ascii_artify/
├── index.html                 # Main application entry
├── server.py                  # Local server with CORS headers
├── css/
│   ├── main.css              # Base styles
│   └── components/
│       ├── controls.css      # Control panel styles
│       ├── preview.css       # Preview area styles
│       └── video.css         # Video controls styles
├── js/
│   ├── main.js               # Application bootstrap
│   ├── config.js             # Configuration constants
│   ├── core/
│   │   ├── AsciiEngine.js    # Converter orchestration (Strategy pattern)
│   │   ├── ImageProcessor.js # Image processing pipeline
│   │   ├── CanvasRenderer.js # ASCII to canvas rendering
│   │   └── VideoProcessor.js # Video processing pipeline
│   ├── converters/
│   │   ├── BaseConverter.js  # Abstract base with helper methods
│   │   ├── DensityConverter.js    # Brightness-based ASCII
│   │   └── EdgeDetectionConverter.js # Canny edge + dual charset
│   ├── ffmpeg/
│   │   └── FFmpegManager.js  # FFMPEG.wasm wrapper singleton
│   ├── ui/
│   │   ├── InputHandler.js   # File input & drag-drop
│   │   ├── ControlPanel.js   # Image settings UI
│   │   ├── VideoControls.js  # Video settings UI
│   │   ├── UIController.js   # UI coordination
│   │   └── ExportHandler.js  # PNG/text/video export
│   └── utils/
│       ├── EventBus.js       # Pub/sub module communication
│       └── CannyEdgeDetection.js # Canny algorithm implementation
├── lib/
│   └── ffmpeg/               # Local FFMPEG.wasm files
│       ├── ffmpeg-core.js
│       ├── ffmpeg-core.wasm
│       ├── worker.js
│       └── ...               # Supporting modules
└── TestFiles/                # Test images/videos (gitignored)
```

### Key Design Patterns
- **Strategy Pattern**: Converters are pluggable via AsciiEngine
- **Event-Driven**: Modules communicate via EventBus pub/sub
- **ES6 Modules**: All JS uses native module imports
- **Singleton**: FFmpegManager for FFMPEG.wasm instance management

### Converters

#### DensityConverter
Brightness-based ASCII conversion using a single character set ordered from light to dark.

#### EdgeDetectionConverter
Uses Canny edge detection with dual-axis character selection:
- **Edge pixels** → Uppercase characters (brightness-mapped): `ILJTFYVCXZAHKNMBDPQRUWG@#%&`
- **Fill pixels** → Lowercase/punctuation (brightness-mapped): ` .'`,;:_-~"<>+*^ilcstfvoabdeghknpqruymwxzj`
- **Color** → Sampled from downsampled image
- **Darker pixels** → Smaller characters

Configurable Canny thresholds (low: 50, high: 150 by default).

## Features

### Image Mode
- Drag & drop or click to upload images
- ASCII width control (20-300 characters)
- Custom character set
- Color mode (Monochrome/Color)
- Converter selection (Density/Edge Detection)
- Canny threshold adjustment (Edge Detection mode)
- Export as PNG or Text

### Video Mode
- MP4/WebM video support via FFMPEG.wasm
- All image settings available (width, charset, color, converter)
- Preview frame scrubbing
- Audio inclusion toggle
- Sequential frame processing with progress indicator
- MP4 output with optional audio preservation

## Current Status

### Completed
- Core infrastructure (EventBus, config, HTML/CSS)
- DensityConverter (brightness-based)
- EdgeDetectionConverter with Canny algorithm
- Image processing pipeline with all settings
- PNG and text export
- Video support with FFMPEG.wasm
- Video controls (width, charset, color mode, converter, audio toggle)
- Video to ASCII conversion pipeline
- MP4 encoding with audio support

### Known Limitations
- Video processing is sequential (no Web Workers) - can be slow for long videos
- FFMPEG.wasm requires CORS headers - won't work on standard static hosts
- Large videos may cause memory issues in the browser

## Configuration
Key settings in `js/config.js`:
- `ascii.defaultWidth`: 100
- `ascii.edgeDetection.defaultCannyLowThreshold`: 50
- `ascii.edgeDetection.defaultCannyHighThreshold`: 150
- `video.maxFrameWidth`: 200
- `video.targetFPS`: 24
- `ffmpeg.coreURL`, `ffmpeg.wasmURL`, `ffmpeg.workerURL`: Local FFMPEG paths

## Testing

### Image Testing
1. Start local server: `python server.py`
2. Open http://localhost:8080
3. Upload an image (drag-drop or click)
4. Adjust settings (width, color mode, converter)
5. Click "Convert to ASCII"
6. Export as PNG or Text

### Video Testing
1. Start local server: `python server.py`
2. Open http://localhost:8080
3. Upload a video file (MP4/WebM)
4. Adjust settings in the Conversion Settings panel
5. Use preview slider to check different frames
6. Toggle "Include Audio" if desired
7. Click "Convert Video"
8. Wait for extraction → conversion → encoding phases
9. Video will auto-download when complete
