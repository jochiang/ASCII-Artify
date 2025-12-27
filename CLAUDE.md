# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ASCII Artify - A client-side web application that converts images and videos to ASCII art. Built with vanilla-adjacent JavaScript (pure JS + FFMPEG.wasm for video). Features two conversion algorithms: density-based and edge detection-based ASCII conversion.

**Live Site**: https://jochiang.github.io/ASCII-Artify/

## Development Commands

### Local Testing
```bash
# For image conversion only (simple server)
python -m http.server 8080

# For video conversion (requires CORS headers for SharedArrayBuffer)
python server.py

# Then open http://localhost:8080 in browser
```

### Deployment
The app is deployed on GitHub Pages with full video support enabled via `coi-serviceworker.js`.

```bash
git push origin master:main
# GitHub Pages auto-deploys from main branch
```

## Architecture

### File Structure
```
ascii_artify/
├── index.html                 # Main application entry
├── coi-serviceworker.js       # Enables SharedArrayBuffer on GitHub Pages
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
- **Color** → Sampled from downsampled image with luminance boost
- **Darker pixels** → Smaller characters

Configurable Canny thresholds (low: 50, high: 150 by default).

### Color Mode Enhancements
In color mode, colors are enhanced for better visibility on black backgrounds:

#### Saturation Boost (User-Adjustable)
- Slider control (0.5x - 2.0x, default 1.0x)
- Converts RGB → HSL, multiplies saturation, converts back
- Applied before luminance boost
- See `BaseConverter.boostSaturation()` method

#### Luminance Boost (Automatic)
- **Normal colors**: 1.35x boost
- **Very dark pixels** (max RGB < 50): 1.7x boost
- See `BaseConverter.boostLuminance()` method

## Features

### Image Mode
- Drag & drop or click to upload images (no file size limit)
- ASCII width control (20-300 characters)
- Custom character set
- Color mode (Monochrome/Color) with saturation boost slider and luminance boost
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

## GitHub Pages Video Support

Video conversion works on GitHub Pages thanks to `coi-serviceworker.js`, which injects the required CORS headers via a service worker:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

This enables `SharedArrayBuffer` which FFMPEG.wasm requires. The page reloads once on first visit to activate the service worker.

FFmpegManager converts relative paths to absolute URLs to prevent path resolution issues in workers (see `js/ffmpeg/FFmpegManager.js`).

## Configuration
Key settings in `js/config.js`:
- `ascii.defaultWidth`: 100
- `ascii.defaultSaturationBoost`: 1.0 (range: 0.5-2.0)
- `ascii.edgeDetection.defaultCannyLowThreshold`: 50
- `ascii.edgeDetection.defaultCannyHighThreshold`: 150
- `video.maxFrameWidth`: 200
- `video.targetFPS`: 24
- `ffmpeg.coreURL`, `ffmpeg.wasmURL`, `ffmpeg.workerURL`: Relative FFMPEG paths (`./lib/ffmpeg/...`)

## Testing

### Quick Test (Live Site)
Visit https://jochiang.github.io/ASCII-Artify/ - both image and video conversion work.

### Local Image Testing
1. Start simple server: `python -m http.server 8080`
2. Open http://localhost:8080
3. Upload an image and convert

### Local Video Testing
1. Start CORS server: `python server.py`
2. Open http://localhost:8080
3. Upload a video file (MP4/WebM)
4. Adjust settings, click "Convert Video"
5. Wait for extraction → conversion → encoding phases
