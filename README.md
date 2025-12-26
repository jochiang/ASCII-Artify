# ASCII Artify

A client-side web application that converts images and videos to ASCII art. Built with vanilla-adjacent JavaScript (pure JS + FFMPEG.wasm for video). Features both brightness-based density conversion and a custom Canny edge detection algorithm.

## Features

### Image Conversion
- **Drag & drop** or click to upload images (JPG, PNG, GIF, WebP)
- **Two conversion modes**:
  - **Density (Brightness)**: Classic ASCII art using character density to represent brightness
  - **Edge Detection**: Canny algorithm with dual-axis character mapping for enhanced detail
- **Color modes**: Monochrome or full color output
- **Adjustable parameters**:
  - ASCII width (20-300 characters)
  - Custom character sets
  - Canny edge detection thresholds
- **Export options**: PNG image or plain text

### Video Conversion
- **Supported formats**: MP4, WebM
- **Frame-by-frame processing** with real-time progress tracking
- **Audio preservation**: Optional toggle to include/exclude original audio
- **All image conversion options** available for video
- **Preview frame scrubbing**: Test settings on any frame before full conversion
- **MP4 output**: Downloadable video file

## Quick Start

### Live Demo
Try it now at: **https://jochiang.github.io/ASCII-Artify/**

Both image and video conversion work on the live site. The page uses a service worker to enable video processing in the browser.

### Local Development
```bash
# Clone the repository
git clone https://github.com/jochiang/ASCII-Artify.git
cd ASCII-Artify

# For image conversion only (simple server)
python -m http.server 8080

# For video conversion (requires CORS headers for SharedArrayBuffer)
python server.py
```

**Note:** Video conversion requires `SharedArrayBuffer`, which needs specific CORS headers. The live GitHub Pages site handles this automatically via `coi-serviceworker`. For local development with video, use `server.py` which adds the required headers.

## Usage

### Converting Images
1. Drag and drop an image onto the upload zone, or click to select
2. Adjust settings:
   - **ASCII Width**: Controls output resolution (20-300 characters)
   - **Character Set**: Characters used for conversion (light to dark)
   - **Color Mode**: Monochrome or Color
   - **Converter**: Density or Edge Detection
3. Click "Convert to ASCII"
4. Export as PNG or Text

### Converting Videos
1. Upload a video file (MP4 or WebM)
2. Use the preview slider to navigate through the video
3. Adjust conversion settings and preview on any frame
4. Toggle audio inclusion on/off as desired
5. Click "Convert Video"
6. Wait for processing (progress bar shows current phase):
   - **Green**: Extracting frames
   - **Purple**: Converting frames to ASCII
   - **Orange**: Encoding final video
7. Video automatically downloads when complete

## Technical Details

### Architecture
- **Pure vanilla JavaScript** - No frameworks or build tools required
- **ES6 modules** with pub/sub event-driven architecture
- **Strategy pattern** for pluggable converters
- **FFMPEG.wasm** for client-side video processing

### Edge Detection Algorithm
The custom EdgeDetectionConverter uses Canny edge detection with a unique dual-charset approach:
- **Edge pixels**: Mapped to uppercase characters based on edge strength (`ILJTFYVCXZAHKNMBDPQRUWG@#%&`)
- **Fill pixels**: Mapped to lowercase/punctuation based on brightness (` .'`,;:_-~"<>+*^ilcstfvoabdeghknpqruymwxzj`)
- **Color sampling**: Preserved from original image when in color mode
- **Configurable thresholds**: Adjust Canny low/high thresholds (0-255)

### Browser Requirements
- Modern browser with ES6 module support
- **For video conversion**: Browser must support SharedArrayBuffer
  - Chrome/Edge: Works by default on localhost
  - Firefox: Works by default on localhost
  - Safari: Limited SharedArrayBuffer support

### File Structure
```
ascii_artify/
├── index.html              # Main application
├── css/
│   ├── main.css           # Base styles
│   └── components/        # Component styles
│       ├── controls.css   # Control panel styling
│       ├── preview.css    # Preview area styling
│       └── video.css      # Video controls styling
├── js/
│   ├── main.js            # Application bootstrap
│   ├── config.js          # Configuration
│   ├── core/
│   │   ├── AsciiEngine.js      # Converter orchestration
│   │   ├── ImageProcessor.js   # Image processing pipeline
│   │   ├── VideoProcessor.js   # Video processing pipeline
│   │   └── CanvasRenderer.js   # ASCII to canvas rendering
│   ├── converters/
│   │   ├── BaseConverter.js           # Abstract base class
│   │   ├── DensityConverter.js        # Brightness-based conversion
│   │   └── EdgeDetectionConverter.js  # Canny edge detection
│   ├── ffmpeg/
│   │   └── FFmpegManager.js    # FFMPEG.wasm wrapper
│   ├── ui/
│   │   ├── UIController.js     # UI coordination
│   │   ├── InputHandler.js     # File input handling
│   │   ├── ControlPanel.js     # Image settings UI
│   │   ├── VideoControls.js    # Video settings UI
│   │   └── ExportHandler.js    # Export functionality
│   └── utils/
│       ├── EventBus.js              # Pub/sub system
│       └── CannyEdgeDetection.js    # Canny algorithm
└── lib/
    └── ffmpeg/             # FFMPEG.wasm libraries
```

## Configuration

Key settings can be adjusted in `js/config.js`:

```javascript
ascii: {
  defaultWidth: 100,
  defaultCharSet: ' .:-=+*#%@',
  edgeDetection: {
    defaultCannyLowThreshold: 50,
    defaultCannyHighThreshold: 150,
    defaultEdgeCharSet: 'ILJTFYVCXZAHKNMBDPQRUWG@#%&',
    defaultFillCharSet: " .'`,;:_-~\"<>+*^ilcstfvoabdeghknpqruymwxzj"
  }
},
video: {
  maxFrameWidth: 200,
  targetFPS: 24
}
```

## Performance Notes

- **Image conversion**: Near-instant for most images
- **Video conversion**: Processing time depends on:
  - Video length and resolution
  - ASCII width setting
  - Browser and hardware capabilities
- **Memory**: Large videos may require significant memory
- **Recommendation**: For videos longer than 5 minutes, consider lower ASCII width settings

## Supported File Formats

### Images
- JPG/JPEG
- PNG
- GIF
- WebP

### Videos
- MP4
- WebM

## Event System

The application uses an EventBus for decoupled communication:
- `file:selected` - Image uploaded
- `file:video-selected` - Video uploaded
- `video:loaded` - Video metadata extracted
- `video:progress` - Video processing progress update
- `video:process-complete` - Video conversion finished
- `action:convert` - Convert button clicked
- `settings:changed` - Settings modified

## License

MIT License - Free to use and modify

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Acknowledgments

- [FFMPEG.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) for client-side video processing
- Canny edge detection algorithm for enhanced ASCII art
