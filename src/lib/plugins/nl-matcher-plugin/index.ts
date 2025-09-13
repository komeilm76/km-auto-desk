import jetpack from 'fs-jetpack';
import { ColorMode, Image } from '@nut-tree-fork/shared';
import sharp from 'sharp';
import { createHash } from 'crypto';
import path from 'path';
import adapter from './adapter';
/**
 * ColorMode enum representing different color modes for images
 */

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

const install = (
  entryAdapter: InstanceType<typeof adapter.DefaultAdapter> = new adapter.DefaultAdapter()
) => {
  adapter.register(entryAdapter);
};

export default {
  install,
};
