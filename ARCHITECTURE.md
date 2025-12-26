# ASCII Artify - Architecture Documentation

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ASCII Artify                              │
│                    (Browser-Based Application)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐         ┌──────────────────┐              │
│  │  User Interface │◄───────►│   Event Bus      │              │
│  │   (UI Layer)    │         │  (Communication) │              │
│  └─────────────────┘         └──────────────────┘              │
│         │                              ▲                         │
│         │                              │                         │
│         ▼                              │                         │
│  ┌─────────────────────────────────────┴───────────────┐       │
│  │           Processing Layer (Core)                    │       │
│  │  ┌──────────┐  ┌─────────────┐  ┌────────────────┐ │       │
│  │  │  ASCII   │  │   Image     │  │    Canvas      │ │       │
│  │  │  Engine  │◄─┤  Processor  │─►│   Renderer     │ │       │
│  │  └──────────┘  └─────────────┘  └────────────────┘ │       │
│  └────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐        │
│  │        Converter Strategy Pattern                   │        │
│  │  ┌──────────────┐  ┌──────────────────────────┐   │        │
│  │  │     Base     │  │   DensityConverter       │   │        │
│  │  │  Converter   │◄─┤   (Brightness-based)     │   │        │
│  │  └──────────────┘  └──────────────────────────┘   │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Module Interaction Flow

### 1. File Upload Flow

```
User Action (Drag & Drop or Click)
        │
        ▼
┌───────────────────┐
│  InputHandler     │  - Validates file type and size
└────────┬──────────┘  - Emits 'file:selected' event
         │
         ▼
    EventBus ─────────────────────┐
         │                        │
         ▼                        ▼
┌────────────────┐      ┌─────────────────┐
│ UIController   │      │ ControlPanel    │
└────────────────┘      └─────────────────┘
   - Shows status         - Enables convert button
   - Clears preview
```

### 2. Image Conversion Flow

```
User clicks "Convert to ASCII"
        │
        ▼
┌───────────────────┐
│  ControlPanel     │  - Emits 'action:convert' with settings
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  UIController     │  - Calls ImageProcessor.process()
└────────┬──────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                    ImageProcessor                              │
├────────────────────────────────────────────────────────────────┤
│  Step 1: loadImageFromFile(file)                              │
│         │                                                       │
│         ▼                                                       │
│    FileReader → Image element → Emit 'image:loaded'           │
│                                                                 │
│  Step 2: extractImageData(image)                              │
│         │                                                       │
│         ▼                                                       │
│    Canvas context → getImageData() → Emit 'imagedata:extracted'│
│                                                                 │
│  Step 3: convertToAscii(options)                              │
│         │                                                       │
│         ▼                                                       │
│    ┌─────────────────────────────────────────────┐            │
│    │           AsciiEngine                       │            │
│    │  - Delegates to active converter            │            │
│    │  - Emits 'conversion:start'                 │            │
│    │                                              │            │
│    │  ┌─────────────────────────────┐           │            │
│    │  │   DensityConverter          │           │            │
│    │  │  - Sample pixels            │           │            │
│    │  │  - Calculate brightness     │           │            │
│    │  │  - Map to characters        │           │            │
│    │  │  - Return ASCII data        │           │            │
│    │  └─────────────────────────────┘           │            │
│    │                                              │            │
│    │  - Emits 'conversion:complete'              │            │
│    └─────────────────────────────────────────────┘            │
│                                                                 │
│  Step 4: renderToCanvas(renderOptions)                        │
│         │                                                       │
│         ▼                                                       │
│    ┌─────────────────────────────────────────────┐            │
│    │         CanvasRenderer                      │            │
│    │  - Create canvas                            │            │
│    │  - Set font properties                      │            │
│    │  - Draw each character                      │            │
│    │  - Return canvas element                    │            │
│    └─────────────────────────────────────────────┘            │
│                                                                 │
│  Result: Canvas element → Emit 'processing:complete'          │
└────────────────────────────────────────────────────────────────┘
         │
         ▼
┌───────────────────┐
│  UIController     │  - Displays canvas in preview
└───────────────────┘  - Shows success message
                        - Enables export buttons
```

### 3. Real-Time Settings Update Flow

```
User adjusts slider/input
        │
        ▼
┌───────────────────┐
│  ControlPanel     │  - Emits 'settings:changed'
└────────┬──────────┘
         │
         ▼
    EventBus (500ms debounce)
         │
         ▼
┌───────────────────┐
│  UIController     │  - Checks if image loaded
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  ImageProcessor   │  - Calls reprocess() with new settings
└────────┬──────────┘    (uses cached ImageData)
         │
         ▼
    Convert → Render → Display
```

### 4. Export Flow

```
User clicks "Export as PNG" or "Export as Text"
        │
        ├─────────────────────┬──────────────────────┐
        ▼                     ▼                      ▼
┌──────────────┐     ┌──────────────┐      ┌──────────────┐
│ ControlPanel │     │  EventBus    │      │ExportHandler │
└──────┬───────┘     └──────────────┘      └──────┬───────┘
       │                                            │
       │  Emits 'action:export-png'                │
       │  or 'action:export-text'                  │
       └───────────────────────────────────────────►
                                                    │
                                                    ▼
                                        ┌───────────────────────┐
                                        │  PNG Export:          │
                                        │  - Get canvas         │
                                        │  - Convert to blob    │
                                        │  - Create download    │
                                        └───────────────────────┘
                                                    │
                                                    ▼
                                        ┌───────────────────────┐
                                        │  Text Export:         │
                                        │  - Get ASCII text     │
                                        │  - Create blob        │
                                        │  - Create download    │
                                        └───────────────────────┘
                                                    │
                                                    ▼
                                            Browser download
```

## Data Structures

### ASCII Data Structure
```javascript
{
  chars: [
    ['#', '#', '@', '@', ' ', ' '],  // Row 0
    ['#', '@', '@', ' ', ' ', '.'],  // Row 1
    ['@', '@', ' ', ' ', '.', '.'],  // Row 2
    // ... more rows
  ],
  colors: [
    ['#fff', '#fff', '#fff', '#fff', '#fff', '#fff'],  // Row 0 colors
    ['#fff', '#fff', '#fff', '#fff', '#fff', '#fff'],  // Row 1 colors
    // ... more rows
  ],
  width: 100,   // Number of characters wide
  height: 50    // Number of characters tall
}
```

### Conversion Options
```javascript
{
  charSet: ' .:-=+*#%@',      // Character set for mapping
  width: 100,                  // ASCII width in characters
  colorMode: 'monochrome',     // 'monochrome' or 'color'
  renderOptions: {             // Canvas rendering options
    fontSize: 10,
    fontFamily: 'Courier New',
    lineHeight: 1.2,
    backgroundColor: '#000000',
    foregroundColor: '#ffffff'
  }
}
```

## Event System

### Event Categories

#### File Events
- `file:selected` - User selected a file
  - Data: `{ file: File }`

#### Input Events
- `input:error` - File validation error
  - Data: `{ message: string }`

#### Processing Events
- `processing:start` - Processing started
  - Data: `{ file: File }`
- `processing:complete` - Processing finished
  - Data: `{ canvas: HTMLCanvasElement }`
- `processing:error` - Processing failed
  - Data: `{ error: Error }`

#### Reprocessing Events (Settings Change)
- `reprocessing:start` - Reprocessing with new settings
  - Data: `{ options: Object }`
- `reprocessing:complete` - Reprocessing finished
  - Data: `{ canvas: HTMLCanvasElement }`
- `reprocessing:error` - Reprocessing failed
  - Data: `{ error: Error }`

#### Image Events
- `image:loaded` - Image loaded into memory
  - Data: `{ image: HTMLImageElement }`
- `imagedata:extracted` - ImageData extracted
  - Data: `{ imageData: ImageData }`

#### Conversion Events
- `conversion:start` - ASCII conversion started
  - Data: `{ converter: string, options: Object }`
- `conversion:complete` - ASCII conversion complete
  - Data: `{ converter: string, result: Object }`
- `conversion:error` - ASCII conversion failed
  - Data: `{ converter: string, error: Error }`

#### Converter Events
- `converter:registered` - New converter registered
  - Data: `{ name: string, converter: BaseConverter }`
- `converter:changed` - Active converter changed
  - Data: `{ name: string }`
- `converter:selected` - User selected converter
  - Data: `{ converter: string }`

#### Canvas Events
- `canvas:rendered` - Canvas rendering complete
  - Data: `{ canvas: HTMLCanvasElement }`

#### Settings Events
- `settings:changed` - User changed settings
  - Data: `{ width: number, charSet: string, colorMode: string }`

#### Action Events
- `action:convert` - User clicked convert button
  - Data: Settings object
- `action:export-png` - User clicked export PNG
- `action:export-text` - User clicked export text

#### Export Events
- `export:success` - Export successful
  - Data: `{ format: string }`
- `export:error` - Export failed
  - Data: `{ format: string, error: Error }`

## Module Dependencies

```
main.js
├── core/
│   ├── AsciiEngine.js
│   │   └── utils/EventBus.js
│   ├── ImageProcessor.js
│   │   ├── utils/EventBus.js
│   │   ├── AsciiEngine.js (injected)
│   │   └── CanvasRenderer.js (injected)
│   └── CanvasRenderer.js
│       └── config.js
├── converters/
│   ├── BaseConverter.js
│   └── DensityConverter.js
│       └── BaseConverter.js
├── ui/
│   ├── InputHandler.js
│   │   ├── utils/EventBus.js
│   │   └── config.js
│   ├── ControlPanel.js
│   │   ├── utils/EventBus.js
│   │   └── config.js
│   ├── UIController.js
│   │   ├── utils/EventBus.js
│   │   ├── InputHandler.js (injected)
│   │   ├── ControlPanel.js (injected)
│   │   └── ImageProcessor.js (injected)
│   └── ExportHandler.js
│       ├── utils/EventBus.js
│       ├── ImageProcessor.js (injected)
│       └── CanvasRenderer.js (injected)
├── utils/
│   └── EventBus.js (singleton)
└── config.js
```

## Design Patterns Used

### 1. Strategy Pattern
- **Where**: AsciiEngine + Converters
- **Purpose**: Pluggable conversion algorithms
- **Benefits**: Easy to add new converters without modifying existing code

### 2. Observer Pattern (Pub/Sub)
- **Where**: EventBus
- **Purpose**: Decoupled module communication
- **Benefits**: Modules don't need to know about each other

### 3. Singleton Pattern
- **Where**: EventBus, Config
- **Purpose**: Single shared instance across application
- **Benefits**: Centralized state, consistent behavior

### 4. Pipeline Pattern
- **Where**: ImageProcessor
- **Purpose**: Sequential data transformation
- **Benefits**: Clear flow, easy to understand and modify

### 5. Dependency Injection
- **Where**: UIController, ImageProcessor, ExportHandler
- **Purpose**: Loose coupling, testability
- **Benefits**: Easy to mock dependencies for testing

## Extension Points

### Adding a New Converter

1. Create new converter class extending `BaseConverter`:
```javascript
// js/converters/MyConverter.js
import BaseConverter from './BaseConverter.js';

export default class MyConverter extends BaseConverter {
  convert(imageData, options) {
    // Your conversion logic here
    return { chars, colors, width, height };
  }

  getDescription() {
    return 'My custom conversion algorithm';
  }
}
```

2. Register in main.js:
```javascript
import MyConverter from './converters/MyConverter.js';

// In setupConverters()
this.asciiEngine.registerConverter('my-converter', new MyConverter());
```

3. Add to UI dropdown:
```html
<option value="my-converter">My Converter</option>
```

### Adding New Events

Simply emit and listen:
```javascript
// Emit
EventBus.emit('my:event', { data: 'value' });

// Listen
EventBus.on('my:event', (data) => {
  console.log(data);
});
```

### Adding New Export Formats

Add method to ExportHandler:
```javascript
exportAsFormat() {
  // Create blob
  const blob = new Blob([data], { type: 'mime/type' });
  this.downloadBlob(blob, 'filename.ext');
  EventBus.emit('export:success', { format: 'format' });
}
```

## Performance Characteristics

### Time Complexity
- **Image Loading**: O(1) - FileReader API
- **ImageData Extraction**: O(w × h) - Canvas drawImage
- **ASCII Conversion**: O(asciiWidth × asciiHeight) - Cell sampling
- **Canvas Rendering**: O(asciiWidth × asciiHeight) - Character drawing
- **Overall**: O(w × h) where w, h are ASCII dimensions

### Space Complexity
- **ImageData**: O(imageWidth × imageHeight × 4) - RGBA data
- **ASCII Data**: O(asciiWidth × asciiHeight × 2) - chars + colors
- **Canvas**: O(canvasWidth × canvasHeight × 4) - RGBA pixels
- **Overall**: Linear in output size

### Bottlenecks (Current)
1. **Synchronous Processing** - Blocks UI during conversion
2. **Full ImageData** - Stores entire image in memory
3. **Character Rendering** - fillText() called for each character

### Optimizations (Future Phases)
1. **Web Workers** - Parallel processing, non-blocking
2. **Chunked Processing** - Process in smaller batches
3. **Bitmap Rendering** - Pre-render characters to bitmap cache
4. **OffscreenCanvas** - Render in background thread

## Security Considerations

### Current Implementation
- ✅ Client-side only (no server upload)
- ✅ File type validation
- ✅ File size limits (10MB)
- ✅ No eval() or dangerous code execution
- ✅ Blob URLs properly revoked

### Future Considerations
- Content Security Policy (CSP) headers
- Sanitize user-provided character sets
- Rate limiting for conversions
- Memory leak prevention

## Browser Compatibility

### Required APIs
- ES6 Modules (import/export)
- FileReader API
- Canvas API (2D context)
- Blob API
- URL.createObjectURL
- Async/await
- Array methods (map, forEach, etc.)
- Modern DOM APIs

### Tested Browsers
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

### Not Supported
- Internet Explorer (no ES6 modules)
- Very old mobile browsers

## Conclusion

The architecture is designed for:
- **Modularity**: Each module has a single, clear responsibility
- **Extensibility**: Easy to add new converters, exporters, features
- **Maintainability**: Clean interfaces, well-documented code
- **Testability**: Dependency injection, event-driven communication
- **Performance**: Efficient algorithms, ready for optimization
- **User Experience**: Responsive UI, clear feedback, intuitive workflow

The system is ready for Phase 3 (Video) and Phase 4 (Optimization) expansion.
