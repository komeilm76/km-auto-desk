import sharp, { Sharp, OutputInfo, JpegOptions, PngOptions, WebpOptions, AvifOptions } from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { createHash } from 'crypto';

// ==================== TYPE DEFINITIONS ====================

/**
 * Extended Sharp interface with unsharp method
 */
export interface SharpWithUnsharp extends Sharp {
  unsharp(options: { radius?: number; amount?: number; threshold?: number }): SharpWithUnsharp;
}

/**
 * Sharpening configuration interface
 */
export interface SharpeningConfig {
  enabled: boolean;
  sigma: number;
  m1: number;
  m2: number;
  x1?: number;
  y2?: number;
  y3?: number;
}

/**
 * Noise reduction configuration interface
 */
export interface NoiseReductionConfig {
  enabled: boolean;
  strength: number;
}

/**
 * Unsharp mask configuration interface
 */
export interface UnsharpMaskConfig {
  enabled: boolean;
  radius: number;
  amount: number;
  threshold: number;
}

/**
 * Text enhancement configuration interface
 */
export interface TextEnhancementConfig {
  edgeBias: number;
  detailExtraction: number;
}

/**
 * Main enhancement options interface
 */
export interface EnhancementOptions {
  sharpening?: SharpeningConfig;
  contrast?: number;
  brightness?: number;
  saturation?: number;
  gamma?: number;
  noiseReduction?: NoiseReductionConfig;
  unsharpMask?: UnsharpMaskConfig;
  textEnhancement?: TextEnhancementConfig;
  format?: 'jpeg' | 'jpg' | 'png' | 'webp' | 'avif';
  quality?: number;
}

/**
 * Processing result interface
 */
export interface ProcessingResult {
  success: boolean;
  inputPath: string;
  outputPath: string;
  error?: string;
  info?: OutputInfo;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Type guard to check if sharp instance has unsharp method
 */
function hasUnsharpMethod(image: Sharp): image is SharpWithUnsharp {
  return 'unsharp' in image;
}

/**
 * Apply unsharp mask to image with fallback if method not available
 */
async function applyUnsharpMask(
  image: Sharp,
  radius: number,
  amount: number,
  threshold: number
): Promise<Sharp> {
  if (hasUnsharpMethod(image)) {
    return image.unsharp({ radius, amount, threshold });
  } else {
    // Fallback: use sharpening with similar parameters
    console.warn('unsharp method not available, using sharpening as fallback');
    return image.sharpen({
      sigma: radius,
      m1: amount * 0.5,
      m2: amount * 1.5,
    });
  }
}

// ==================== ENHANCEMENT FUNCTIONS ====================

/**
 * Enhances image quality by applying multiple processing operations
 * @param inputPath - Path to the source image
 * @param outputPath - Path to save the enhanced image
 * @param options - Enhancement options
 * @returns Promise resolving to processing information
 */
async function enhanceImageQuality(
  inputPath: string,
  outputPath: string,
  options: EnhancementOptions = {}
): Promise<ProcessingResult> {
  // Default options
  const defaultOptions: EnhancementOptions = {
    sharpening: {
      enabled: true,
      sigma: 1.5,
      m1: 1.0,
      m2: 2.0,
    },
    contrast: 1.1,
    brightness: 1.05,
    saturation: 1.1,
    gamma: 1.0,
    noiseReduction: {
      enabled: true,
      strength: 0.5,
    },
    format: 'webp',
    quality: 85,
  };

  // Merge provided options with defaults
  const config: EnhancementOptions = { ...defaultOptions, ...options };

  try {
    let image: Sharp = sharp(inputPath);
    const metadata = await image.metadata();

    // Apply sharpening if enabled
    if (config.sharpening?.enabled) {
      image = image.sharpen({
        sigma: config.sharpening.sigma,
        m1: config.sharpening.m1,
        m2: config.sharpening.m2,
        x1: config.sharpening.x1,
        y2: config.sharpening.y2,
        y3: config.sharpening.y3,
      });
    }

    // Adjust image properties
    image = image.modulate({
      brightness: config.brightness,
      saturation: config.saturation,
    });

    // Apply contrast using linear transformation
    if (config.contrast && config.contrast !== 1.0) {
      image = image.linear(config.contrast, -(config.contrast * 0.5) / 2);
    }

    // Apply gamma correction
    if (config.gamma && config.gamma !== 1.0) {
      image = image.gamma(config.gamma);
    }

    // Apply noise reduction
    if (config.noiseReduction?.enabled) {
      image = image.blur(config.noiseReduction.strength);
    }

    // Apply unsharp mask if enabled
    if (config.unsharpMask?.enabled) {
      image = await applyUnsharpMask(
        image,
        config.unsharpMask.radius,
        config.unsharpMask.amount,
        config.unsharpMask.threshold
      );
    }

    // Set output format and quality
    const formatOptions: JpegOptions | PngOptions | WebpOptions | AvifOptions = {};

    if (config.format === 'jpeg' || config.format === 'jpg') {
      (formatOptions as JpegOptions).quality = config.quality;
      (formatOptions as JpegOptions).mozjpeg = true;
      (formatOptions as JpegOptions).progressive = true;
    } else if (config.format === 'webp') {
      (formatOptions as WebpOptions).quality = config.quality;
      (formatOptions as WebpOptions).smartSubsample = true;
      (formatOptions as WebpOptions).effort = 4;
    } else if (config.format === 'avif') {
      (formatOptions as AvifOptions).quality = config.quality;
      (formatOptions as AvifOptions).effort = 5;
    } else if (config.format === 'png') {
      (formatOptions as PngOptions).compressionLevel = 9;
      (formatOptions as PngOptions).adaptiveFiltering = true;
    }

    // Process and save the image
    const info: OutputInfo = await image
      .toFormat(config.format!, formatOptions)
      .withMetadata()
      .toFile(outputPath);

    console.log(`Image enhanced successfully: ${outputPath}`);

    return {
      success: true,
      inputPath,
      outputPath,
      info,
    };
  } catch (error) {
    console.error('Error enhancing image:', error);

    return {
      success: false,
      inputPath,
      outputPath,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Specialized function to enhance text visibility in images
 * @param inputPath - Path to source image containing text
 * @param outputPath - Path for output image
 * @param options - Text enhancement options
 * @returns Promise resolving to processing information
 */
async function enhanceTextInImage(
  inputPath: string,
  outputPath: string,
  options: EnhancementOptions = {}
): Promise<ProcessingResult> {
  // Default options optimized for text enhancement
  const defaultOptions: EnhancementOptions = {
    sharpening: {
      enabled: true,
      sigma: 2.0,
      m1: 1.5,
      m2: 3.0,
    },
    contrast: 1.3,
    brightness: 1.1,
    unsharpMask: {
      enabled: true,
      radius: 1.5,
      amount: 0.6,
      threshold: 0.05,
    },
    format: 'png',
    quality: 100,
  };

  // Merge provided options with defaults
  const config: EnhancementOptions = { ...defaultOptions, ...options };

  try {
    let image: Sharp = sharp(inputPath);

    // High-contrast processing for text clarity
    image = image.linear(config.contrast!, -(config.contrast! * 0.5) / 2);

    // Brightness adjustment
    image = image.modulate({
      brightness: config.brightness,
    });

    // Aggressive sharpening for text edges
    if (config.sharpening?.enabled) {
      image = image.sharpen({
        sigma: config.sharpening.sigma,
        m1: config.sharpening.m1,
        m2: config.sharpening.m2,
      });
    }

    // Unsharp mask for additional edge enhancement
    if (config.unsharpMask?.enabled) {
      image = await applyUnsharpMask(
        image,
        config.unsharpMask.radius,
        config.unsharpMask.amount,
        config.unsharpMask.threshold
      );
    }

    // Use PNG for text images to preserve sharp edges
    const formatOptions: PngOptions = {
      compressionLevel: 6,
      adaptiveFiltering: false, // Disable for sharper text
    };

    const info: OutputInfo = await image
      .toFormat(config.format as 'png', formatOptions)
      .toFile(outputPath);

    console.log(`Text enhancement completed: ${outputPath}`);

    return {
      success: true,
      inputPath,
      outputPath,
      info,
    };
  } catch (error) {
    console.error('Error enhancing text in image:', error);

    return {
      success: false,
      inputPath,
      outputPath,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Comprehensive text enhancement using multiple specialized techniques
 * @param inputPath - Source image path
 * @param outputPath - Output image path
 * @param options - Enhancement options
 * @returns Promise resolving to processing information
 */
async function comprehensiveTextEnhancement(
  inputPath: string,
  outputPath: string,
  options: EnhancementOptions = {}
): Promise<ProcessingResult> {
  // Default options optimized for comprehensive text enhancement
  const defaultOptions: EnhancementOptions = {
    sharpening: {
      enabled: true,
      sigma: 2.5,
      m1: 2.0,
      m2: 4.0,
    },
    contrast: 1.4,
    brightness: 1.15,
    unsharpMask: {
      enabled: true,
      radius: 1.2,
      amount: 0.8,
      threshold: 0.03,
    },
    noiseReduction: {
      enabled: true,
      strength: 0.3,
    },
    textEnhancement: {
      edgeBias: 0.7,
      detailExtraction: 0.6,
    },
    format: 'png',
    quality: 100,
  };

  // Merge provided options with defaults
  const config: EnhancementOptions = { ...defaultOptions, ...options };

  try {
    let image: Sharp = sharp(inputPath);
    const metadata = await image.metadata();

    // Step 1: Initial contrast adjustment
    image = image.linear(config.contrast!, -(config.contrast! * 0.5) / 2);

    // Step 2: Brightness modulation
    image = image.modulate({
      brightness: config.brightness,
    });

    // Step 3: Aggressive sharpening for text edges
    if (config.sharpening?.enabled) {
      image = image.sharpen({
        sigma: config.sharpening.sigma,
        m1: config.sharpening.m1,
        m2: config.sharpening.m2,
      });
    }

    // Step 4: Unsharp mask for edge enhancement
    if (config.unsharpMask?.enabled) {
      image = await applyUnsharpMask(
        image,
        config.unsharpMask.radius,
        config.unsharpMask.amount,
        config.unsharpMask.threshold
      );
    }

    // Step 5: Selective noise reduction
    if (config.noiseReduction?.enabled) {
      // Apply slight blur to reduce noise while preserving edges
      image = image.blur(config.noiseReduction.strength);

      // Re-sharpen after blur to maintain text sharpness
      image = image.sharpen({
        sigma: config.sharpening!.sigma * 0.7,
        m1: config.sharpening!.m1 * 0.7,
        m2: config.sharpening!.m2 * 0.7,
      });
    }

    // Step 6: Gamma correction for better contrast perception
    image = image.gamma(1.1);

    // Format-specific options
    const formatOptions: PngOptions = {
      compressionLevel: 6,
      adaptiveFiltering: false,
    };

    const info: OutputInfo = await image
      .toFormat(config.format as 'png', formatOptions)
      .toFile(outputPath);

    console.log(`Comprehensive text enhancement completed: ${outputPath}`);

    return {
      success: true,
      inputPath,
      outputPath,
      info,
    };
  } catch (error) {
    console.error('Error in comprehensive text enhancement:', error);

    return {
      success: false,
      inputPath,
      outputPath,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Process multiple images with text enhancement
 * @param imagePaths - Array of input image paths
 * @param outputDir - Output directory
 * @param options - Enhancement options
 * @returns Promise resolving to results for all processed images
 */
async function batchTextEnhancement(
  imagePaths: string[],
  outputDir: string,
  options: EnhancementOptions = {}
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];

  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    for (const inputPath of imagePaths) {
      const fileName = path.basename(inputPath);
      const nameWithoutExt = path.parse(fileName).name;
      const ext = options.format || 'png';
      const outputPath = path.join(outputDir, `${nameWithoutExt}-enhanced.${ext}`);

      try {
        const result = await comprehensiveTextEnhancement(inputPath, outputPath, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          inputPath,
          outputPath,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error in batch processing:', error);
    throw error;
  }
}

// ==================== ADDITIONAL UTILITY FUNCTIONS ====================

/**
 * Creates a high-quality thumbnail from an image
 * @param inputPath - Path to source image
 * @param outputPath - Path for thumbnail output
 * @param width - Thumbnail width
 * @param height - Thumbnail height (optional, maintains aspect ratio if not provided)
 * @param options - Enhancement options
 * @returns Promise resolving to processing information
 */
async function createHighQualityThumbnail(
  inputPath: string,
  outputPath: string,
  width: number,
  height?: number,
  options: EnhancementOptions = {}
): Promise<ProcessingResult> {
  try {
    let image: Sharp = sharp(inputPath);

    // Resize with high-quality settings
    image = image.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    });

    // Apply enhancement options
    if (options.sharpening?.enabled) {
      image = image.sharpen({
        sigma: options.sharpening.sigma || 1.0,
        m1: options.sharpening.m1 || 1.0,
        m2: options.sharpening.m2 || 2.0,
      });
    }

    if (options.contrast) {
      image = image.linear(options.contrast, -(options.contrast * 0.5) / 2);
    }

    // Format-specific options
    const formatOptions: JpegOptions | WebpOptions = {};
    const format = options.format || 'webp';

    if (format === 'jpeg' || format === 'jpg') {
      (formatOptions as JpegOptions).quality = options.quality || 80;
      (formatOptions as JpegOptions).mozjpeg = true;
    } else if (format === 'webp') {
      (formatOptions as WebpOptions).quality = options.quality || 80;
      (formatOptions as WebpOptions).smartSubsample = true;
    }

    const info: OutputInfo = await image
      .toFormat(format, formatOptions)
      .withMetadata()
      .toFile(outputPath);

    console.log(`Thumbnail created: ${outputPath}`);

    return {
      success: true,
      inputPath,
      outputPath,
      info,
    };
  } catch (error) {
    console.error('Error creating thumbnail:', error);

    return {
      success: false,
      inputPath,
      outputPath,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Extracts and enhances text from a region of an image
 * @param inputPath - Path to source image
 * @param outputPath - Path for output image
 * @param region - Region to extract { left, top, width, height }
 * @param options - Enhancement options
 * @returns Promise resolving to processing information
 */
async function extractAndEnhanceTextRegion(
  inputPath: string,
  outputPath: string,
  region: { left: number; top: number; width: number; height: number },
  options: EnhancementOptions = {}
): Promise<ProcessingResult> {
  try {
    // Extract the region
    const extractedBuffer = await sharp(inputPath)
      .extract({
        left: region.left,
        top: region.top,
        width: region.width,
        height: region.height,
      })
      .toBuffer();

    // Save extracted region to a temporary file
    const tempPath = `temp-extract-${Date.now()}.png`;
    await sharp(extractedBuffer).toFile(tempPath);

    // Enhance the extracted region
    const enhancementResult = await enhanceTextInImage(tempPath, outputPath, options);

    // Clean up temporary file
    try {
      await fs.unlink(tempPath);
    } catch (cleanupError) {
      console.warn('Could not delete temporary file:', cleanupError);
    }

    return enhancementResult;
  } catch (error) {
    console.error('Error extracting text region:', error);

    return {
      success: false,
      inputPath,
      outputPath,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// ==================== USAGE EXAMPLES ====================

/**
 * Example usage of the enhancement functions
 */
async function exampleUsage(): Promise<void> {
  try {
    // Basic enhancement example
    const result1 = await enhanceImageQuality('screenshot.png', 'output-1-(image).png', {
      sharpening: {
        enabled: true,
        sigma: 1.5,
        m1: 1.0,
        m2: 2.0,
      },
      contrast: 1.1,
      brightness: 1.05,
      format: 'png',
      quality: 90,
    });

    // Text enhancement example
    const result2 = await enhanceTextInImage('screenshot.png', 'output-2-(text).png', {
      contrast: 1.5,
      brightness: 1.2,
      sharpening: {
        enabled: true,
        sigma: 3.0,
        m1: 1.5,
        m2: 3.0,
      },
      format: 'png',
    });

    // Comprehensive text enhancement example
    const result3 = await comprehensiveTextEnhancement('screenshot.png', 'output-3.png', {
      contrast: 1.6,
      sharpening: {
        enabled: true,
        sigma: 3.0,
        m1: 2.5,
        m2: 5.0,
      },
      unsharpMask: {
        enabled: true,
        radius: 1.0,
        amount: 1.0,
        threshold: 0.02,
      },
    });

    // Batch processing example
    const images = ['screenshot.png'];
    const batchResults = await batchTextEnhancement(images, './enhanced-documents', {
      contrast: 1.4,
      format: 'png',
    });

    console.log('Enhancement results:', {
      basic: result1,
      text: result2,
      comprehensive: result3,
      batch: batchResults,
    });
  } catch (error) {
    console.error('Error in example usage:', error);
  }
}

// Execute the example
// exampleUsage().catch(console.error);

// ==================== EXPORTS ====================

export default {
  enhanceImageQuality,
  enhanceTextInImage,
  comprehensiveTextEnhancement,
  batchTextEnhancement,
  createHighQualityThumbnail,
  extractAndEnhanceTextRegion,
};
