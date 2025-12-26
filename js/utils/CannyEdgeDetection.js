/**
 * Canny Edge Detection Algorithm
 * Implements the full Canny edge detection pipeline:
 * 1. Gaussian blur (noise reduction)
 * 2. Sobel gradient calculation (magnitude and direction)
 * 3. Non-maximum suppression (edge thinning)
 * 4. Hysteresis thresholding (edge tracking)
 */

export default class CannyEdgeDetection {
  /**
   * Detect edges in grayscale image data
   * @param {Uint8ClampedArray} imageData - Grayscale pixel data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} lowThreshold - Low threshold for hysteresis (0-255)
   * @param {number} highThreshold - High threshold for hysteresis (0-255)
   * @returns {Uint8ClampedArray} - Binary edge map (255 = edge, 0 = non-edge)
   */
  static detectEdges(imageData, width, height, lowThreshold = 50, highThreshold = 150) {
    // Step 1: Gaussian blur
    const blurred = this.gaussianBlur(imageData, width, height);

    // Step 2: Sobel gradients
    const { magnitude, direction } = this.sobelGradient(blurred, width, height);

    // Step 3: Non-maximum suppression
    const suppressed = this.nonMaximumSuppression(magnitude, direction, width, height);

    // Step 4: Hysteresis thresholding
    const edges = this.hysteresisThreshold(suppressed, width, height, lowThreshold, highThreshold);

    return edges;
  }

  /**
   * Apply Gaussian blur using a 5x5 kernel
   * @param {Uint8ClampedArray} data - Input grayscale data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {Float32Array} - Blurred image data
   */
  static gaussianBlur(data, width, height) {
    // 5x5 Gaussian kernel (approximation)
    const kernel = [
      [2, 4, 5, 4, 2],
      [4, 9, 12, 9, 4],
      [5, 12, 15, 12, 5],
      [4, 9, 12, 9, 4],
      [2, 4, 5, 4, 2]
    ];
    const kernelWeight = 159;

    const output = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;

        // Apply kernel
        for (let ky = -2; ky <= 2; ky++) {
          for (let kx = -2; kx <= 2; kx++) {
            const px = Math.min(Math.max(x + kx, 0), width - 1);
            const py = Math.min(Math.max(y + ky, 0), height - 1);
            const weight = kernel[ky + 2][kx + 2];
            sum += data[py * width + px] * weight;
          }
        }

        output[y * width + x] = sum / kernelWeight;
      }
    }

    return output;
  }

  /**
   * Calculate Sobel gradients (magnitude and direction)
   * @param {Float32Array} data - Input image data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {{magnitude: Float32Array, direction: Float32Array}}
   */
  static sobelGradient(data, width, height) {
    // Sobel kernels
    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];

    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];

    const magnitude = new Float32Array(width * height);
    const direction = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        // Apply Sobel kernels
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = x + kx;
            const py = y + ky;
            const value = data[py * width + px];
            gx += value * sobelX[ky + 1][kx + 1];
            gy += value * sobelY[ky + 1][kx + 1];
          }
        }

        const index = y * width + x;
        magnitude[index] = Math.sqrt(gx * gx + gy * gy);
        direction[index] = Math.atan2(gy, gx);
      }
    }

    return { magnitude, direction };
  }

  /**
   * Non-maximum suppression - thin edges to single pixel width
   * @param {Float32Array} magnitude - Gradient magnitude
   * @param {Float32Array} direction - Gradient direction
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {Float32Array} - Suppressed gradient magnitude
   */
  static nonMaximumSuppression(magnitude, direction, width, height) {
    const output = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        const angle = direction[index];
        const mag = magnitude[index];

        // Round angle to nearest 45 degrees (0, 45, 90, 135)
        const angleDeg = ((angle * 180 / Math.PI) + 180) % 180;

        let neighbor1, neighbor2;

        // Determine neighbors based on gradient direction
        if ((angleDeg >= 0 && angleDeg < 22.5) || (angleDeg >= 157.5 && angleDeg < 180)) {
          // Horizontal edge (0°)
          neighbor1 = magnitude[y * width + (x - 1)];
          neighbor2 = magnitude[y * width + (x + 1)];
        } else if (angleDeg >= 22.5 && angleDeg < 67.5) {
          // Diagonal edge (45°)
          neighbor1 = magnitude[(y - 1) * width + (x + 1)];
          neighbor2 = magnitude[(y + 1) * width + (x - 1)];
        } else if (angleDeg >= 67.5 && angleDeg < 112.5) {
          // Vertical edge (90°)
          neighbor1 = magnitude[(y - 1) * width + x];
          neighbor2 = magnitude[(y + 1) * width + x];
        } else {
          // Diagonal edge (135°)
          neighbor1 = magnitude[(y - 1) * width + (x - 1)];
          neighbor2 = magnitude[(y + 1) * width + (x + 1)];
        }

        // Suppress if not local maximum
        if (mag >= neighbor1 && mag >= neighbor2) {
          output[index] = mag;
        } else {
          output[index] = 0;
        }
      }
    }

    return output;
  }

  /**
   * Hysteresis thresholding - trace edges using high and low thresholds
   * @param {Float32Array} magnitude - Suppressed gradient magnitude
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} lowThreshold - Low threshold value
   * @param {number} highThreshold - High threshold value
   * @returns {Uint8ClampedArray} - Binary edge map
   */
  static hysteresisThreshold(magnitude, width, height, lowThreshold, highThreshold) {
    const edges = new Uint8ClampedArray(width * height);
    const visited = new Uint8Array(width * height);

    // Find strong edges (above high threshold)
    const strongEdges = [];
    for (let i = 0; i < magnitude.length; i++) {
      if (magnitude[i] >= highThreshold) {
        edges[i] = 255;
        strongEdges.push(i);
      }
    }

    // Trace edges from strong edges through weak edges (above low threshold)
    while (strongEdges.length > 0) {
      const index = strongEdges.pop();

      if (visited[index]) continue;
      visited[index] = 1;

      const x = index % width;
      const y = Math.floor(index / width);

      // Check 8-connected neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;

          const nx = x + dx;
          const ny = y + dy;

          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

          const neighborIndex = ny * width + nx;

          if (!visited[neighborIndex] && magnitude[neighborIndex] >= lowThreshold) {
            edges[neighborIndex] = 255;
            strongEdges.push(neighborIndex);
          }
        }
      }
    }

    return edges;
  }

  /**
   * Convert RGBA image data to grayscale
   * @param {Uint8ClampedArray} rgbaData - RGBA pixel data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {Uint8ClampedArray} - Grayscale pixel data
   */
  static rgbaToGrayscale(rgbaData, width, height) {
    const grayscale = new Uint8ClampedArray(width * height);

    for (let i = 0; i < width * height; i++) {
      const r = rgbaData[i * 4];
      const g = rgbaData[i * 4 + 1];
      const b = rgbaData[i * 4 + 2];

      // Luminance formula
      grayscale[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }

    return grayscale;
  }
}
