/**
 * AsciiEngine - Converter orchestration using Strategy pattern
 * Manages converter registration and delegates conversion to active converter
 */
import EventBus from '../utils/EventBus.js';

export default class AsciiEngine {
  constructor() {
    this.converters = new Map();
    this.activeConverter = null;
  }

  /**
   * Register a converter
   * @param {string} name - Converter identifier
   * @param {BaseConverter} converter - Converter instance
   */
  registerConverter(name, converter) {
    this.converters.set(name, converter);
    EventBus.emit('converter:registered', { name, converter });
  }

  /**
   * Set the active converter
   * @param {string} name - Converter identifier
   * @throws {Error} If converter not found
   */
  setConverter(name) {
    if (!this.converters.has(name)) {
      throw new Error(`Converter "${name}" not found`);
    }
    this.activeConverter = name;
    EventBus.emit('converter:changed', { name });
  }

  /**
   * Get the active converter instance
   * @returns {BaseConverter}
   * @throws {Error} If no converter is active
   */
  getActiveConverter() {
    if (!this.activeConverter) {
      throw new Error('No converter is active');
    }
    return this.converters.get(this.activeConverter);
  }

  /**
   * Convert ImageData to ASCII art using the active converter
   * @param {ImageData} imageData - Image data to convert
   * @param {Object} options - Conversion options
   * @returns {Object} - { chars: string[][], colors: string[][], width: number, height: number }
   */
  convert(imageData, options) {
    if (!this.activeConverter) {
      throw new Error('No converter is active. Call setConverter() first.');
    }

    const converter = this.getActiveConverter();

    EventBus.emit('conversion:start', {
      converter: this.activeConverter,
      options
    });

    try {
      const result = converter.convert(imageData, options);

      EventBus.emit('conversion:complete', {
        converter: this.activeConverter,
        result
      });

      return result;
    } catch (error) {
      EventBus.emit('conversion:error', {
        converter: this.activeConverter,
        error
      });
      throw error;
    }
  }

  /**
   * Get list of available converters
   * @returns {Array} - Array of { name, description }
   */
  getAvailableConverters() {
    const list = [];
    this.converters.forEach((converter, name) => {
      list.push({
        name,
        description: converter.getDescription()
      });
    });
    return list;
  }

  /**
   * Check if a converter is registered
   * @param {string} name - Converter identifier
   * @returns {boolean}
   */
  hasConverter(name) {
    return this.converters.has(name);
  }

  /**
   * Get the active converter name
   * @returns {string|null}
   */
  getActiveConverterName() {
    return this.activeConverter;
  }
}
