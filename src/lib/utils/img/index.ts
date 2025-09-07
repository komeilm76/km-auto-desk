import * as path from 'path';
import { createHash } from 'crypto';
import sharp, { Channels } from 'sharp';
import jetpack from 'fs-jetpack';
import { Image } from '@nut-tree-fork/shared';
import enhancement from './enhancement';
import defaultFinderAdapter from './defaultFinderAdapter';

/**
 * ColorMode enum representing different color modes for images
 */
export enum ColorMode {
  BGR = 0,
  RGB = 1,
}

/**
 * Image class representing an image with various properties and methods
 * for image manipulation and analysis
 */

/**
 * Loads and processes an image file, returning an Image object
 * @param fileName Path to the image file
 * @returns Promise resolving to an Image instance
 * @throws Error if the image cannot be loaded or processed
 */
export async function imageResource(fileName: string): Promise<Image> {
  try {
    // Read image file buffer using fs-jetpack
    const fileBuffer = await jetpack.readAsync(fileName, 'buffer');

    if (!fileBuffer) {
      throw new Error(`File not found: ${fileName}`);
    }

    // Process image with sharp library to extract metadata and pixel data
    const imageProcessor = sharp(fileBuffer);
    const metadata = await imageProcessor.metadata();

    // Convert image to raw RGB format with alpha channel if available
    const { data, info } = await imageProcessor
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    // Calculate derived properties
    const channels = info.channels;
    const bitsPerPixel = channels * 8; // Assuming 8 bits per channel
    const byteWidth = info.width * channels; // Calculate bytes per row

    // Generate unique identifier for the image
    const fileHash = createHash('md5').update(fileBuffer).digest('hex');
    const imageId = `${path.basename(fileName)}_${fileHash}`;

    // Determine color mode (sharp uses RGB by default)
    const colorMode = ColorMode.RGB;

    // Create and return Image instance
    return new Image(
      info.width,
      info.height,
      data,
      channels,
      imageId,
      bitsPerPixel,
      byteWidth,
      colorMode,
      { scaleX: 1.0, scaleY: 1.0 }
    );
  } catch (error) {
    // @ts-ignore
    throw new Error(`Failed to load image resource: ${fileName}. Error: ${error.message}`);
  }
}

/**
 * Saves an Image object to a file using fs-jetpack and sharp for proper encoding
 * @param image - The Image object to save
 * @param filePath - The destination file path (including filename and extension)
 * @param format - The image format to save as ('png', 'jpeg', 'webp', etc.)
 * @returns Promise that resolves when the image is successfully saved
 * @throws Error if the image cannot be saved
 */
export async function saveImage(
  image: Image,
  filePath: string,
  format: 'png' | 'jpeg' | 'webp' = 'png'
): Promise<void> {
  try {
    // Use sharp to properly encode the image before saving
    const encodedImage = await sharp(image.data, {
      density: 100000,
      raw: {
        width: image.width,
        height: image.height,
        channels: image.channels as Channels,
      },
    })
      [format]() // Use the specified format
      // .toBuffer();

      .grayscale()
      .sharpen()
      .toFile(filePath);

    // Use fs-jetpack to write the properly encoded image data
    // await jetpack.writeAsync(filePath, encodedImage);

    console.log(`Image successfully saved to: ${filePath}`);
  } catch (error) {
    // @ts-ignore
    throw new Error(`Failed to save image: ${error.message}`);
  }
}

/**
 * Saves an Image object with automatic file type detection using fs-jetpack
 * @param image - The Image object to save
 * @param directory - The destination directory
 * @param baseName - The base filename (without extension)
 * @returns Promise that resolves with the full path when the image is successfully saved
 * @throws Error if the image cannot be saved or file type cannot be determined
 */
export async function saveImageWithDetection(
  image: Image,
  directory: string,
  baseName: string
): Promise<string> {
  try {
    // Determine appropriate file extension based on image properties
    const extension = determineImageExtension(image);
    const filePath = path.join(directory, `${baseName}.${extension}`);

    // Save with the appropriate format
    await saveImage(image, filePath, extension as 'png' | 'jpeg');
    return filePath;
  } catch (error) {
    // @ts-ignore
    throw new Error(`Failed to save image with detection: ${error.message}`);
  }
}

/**
 * Determines the appropriate file extension based on image properties
 * @param image - The Image object to analyze
 * @returns Suggested file extension (png, jpg, or webp)
 */
function determineImageExtension(image: Image): string {
  // Simple heuristic based on channels and image properties
  if (image.hasAlphaChannel) {
    return 'png'; // PNG supports transparency
  } else if (image.bitsPerPixel === 24) {
    return 'jpg'; // JPEG is good for photos without transparency
  } else {
    return 'webp'; // WebP is a good modern default
  }
}

/**
 * Type guard to check if an object is an instance of Image
 * @param possibleImage Object to check
 * @returns Boolean indicating if the object is an Image
 */
export function isImage(possibleImage: any): possibleImage is Image {
  return possibleImage instanceof Image;
}
export default {
  isImage,
  determineImageExtension,
  saveImageWithDetection,
  saveImage,
  imageResource,
  enhancement,
  defaultFinderAdapter,
};
