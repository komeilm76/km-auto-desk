import { providerRegistry } from '@nut-tree-fork/nut-js';
import { Image } from '@nut-tree-fork/shared';
import sharp, { Channels } from 'sharp';

/**
 * Region class representing a rectangular area within an image
 */
export class Region {
  /**
   * Creates a new Region instance
   * @param left - The left coordinate of the region
   * @param top - The top coordinate of the region
   * @param width - The width of the region
   * @param height - The height of the region
   */
  constructor(
    public left: number,
    public top: number,
    public width: number,
    public height: number
  ) {}

  /**
   * Calculates the area of the region
   * @returns The area (width × height) of the region
   */
  area(): number {
    return this.width * this.height;
  }

  /**
   * Converts the region to a string representation
   * @returns String representation of the region in format "left,top,width,height"
   */
  toString(): string {
    return `${this.left},${this.top},${this.width},${this.height}`;
  }
}

/**
 * Type guard to check if an object is a Region
 * @param possibleRegion - The object to check
 * @returns True if the object is a Region, false otherwise
 */
export function isRegion(possibleRegion: any): possibleRegion is Region {
  return (
    possibleRegion instanceof Region ||
    (typeof possibleRegion === 'object' &&
      possibleRegion !== null &&
      'left' in possibleRegion &&
      'top' in possibleRegion &&
      'width' in possibleRegion &&
      'height' in possibleRegion &&
      'area' in possibleRegion &&
      'toString' in possibleRegion)
  );
}

/**
 * MatchResult class representing the result of an image matching operation
 * @template LOCATION_TYPE - The type of the location (typically Region)
 */
export class MatchResult<LOCATION_TYPE> {
  /**
   * Creates a new MatchResult instance
   * @param confidence - The confidence level of the match (0-1)
   * @param location - The location where the match was found
   * @param error - Optional error if the match failed
   */
  constructor(
    public readonly confidence: number,
    public readonly location: LOCATION_TYPE,
    public readonly error?: Error | undefined
  ) {}
}

/**
 * MatchRequest class representing a request to find an image within another image
 * @template NEEDLE_TYPE - The type of the needle image (typically Image)
 * @template PROVIDER_DATA_TYPE - Optional additional data for the provider
 */
export class MatchRequest<NEEDLE_TYPE, PROVIDER_DATA_TYPE> {
  /**
   * Creates a new MatchRequest instance
   * @param haystack - The image to search within
   * @param needle - The image to search for
   * @param confidence - The minimum confidence level required for a match
   * @param providerData - Optional additional data for the provider
   */
  constructor(
    public readonly haystack: Image,
    public readonly needle: NEEDLE_TYPE,
    public readonly confidence: number | undefined,
    public readonly providerData?: PROVIDER_DATA_TYPE | undefined
  ) {}
}

/**
 * ImageFinderInterface defining the contract for image matching operations
 */
export interface ImageFinderInterface {
  /**
   * Finds a single match of the needle image in the haystack image
   * @template PROVIDER_DATA_TYPE - Type of additional provider data
   * @param matchRequest - The match request containing haystack, needle, and confidence
   * @returns Promise resolving to a MatchResult with the best match found
   */
  findMatch<PROVIDER_DATA_TYPE>(
    matchRequest: MatchRequest<Image, PROVIDER_DATA_TYPE>
  ): Promise<MatchResult<Region>>;

  /**
   * Finds all matches of the needle image in the haystack image
   * @template PROVIDER_DATA_TYPE - Type of additional provider data
   * @param matchRequest - The match request containing haystack, needle, and confidence
   * @returns Promise resolving to an array of MatchResults for all matches found
   */
  findMatches<PROVIDER_DATA_TYPE>(
    matchRequest: MatchRequest<Image, PROVIDER_DATA_TYPE>
  ): Promise<MatchResult<Region>[]>;
}

/**
 * TemplateImageFinder implements ImageFinderInterface using template matching algorithm
 */
export class DefaultTemplateImageFinder implements ImageFinderInterface {
  /**
   * Default minimum confidence threshold for matches
   */
  private readonly DEFAULT_CONFIDENCE = 0.8;

  /**
   * Finds a single match of the needle image in the haystack image
   * @template PROVIDER_DATA_TYPE - Type of additional provider data
   * @param matchRequest - The match request containing haystack, needle, and confidence
   * @returns Promise resolving to a MatchResult with the best match found
   */
  async findMatch<PROVIDER_DATA_TYPE>(
    matchRequest: MatchRequest<Image, PROVIDER_DATA_TYPE>
  ): Promise<MatchResult<Region>> {
    try {
      // Find all matches and return the one with highest confidence
      const matches = await this.findMatches(matchRequest);

      if (matches.length === 0) {
        return new MatchResult(0, new Region(0, 0, 0, 0), new Error('No matches found'));
      }

      // Return the match with the highest confidence
      return matches.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );
    } catch (error) {
      return new MatchResult(
        0,
        new Region(0, 0, 0, 0),
        error instanceof Error ? error : new Error('Unknown error occurred')
      );
    }
  }

  /**
   * Finds all matches of the needle image in the haystack image
   * @template PROVIDER_DATA_TYPE - Type of additional provider data
   * @param matchRequest - The match request containing haystack, needle, and confidence
   * @returns Promise resolving to an array of MatchResults for all matches found
   */
  async findMatches<PROVIDER_DATA_TYPE>(
    matchRequest: MatchRequest<Image, PROVIDER_DATA_TYPE>
  ): Promise<MatchResult<Region>[]> {
    try {
      const { haystack, needle, confidence } = matchRequest;
      const minConfidence = confidence ?? this.DEFAULT_CONFIDENCE;

      // Validate input images
      if (haystack.width < needle.width || haystack.height < needle.height) {
        throw new Error('Needle image is larger than haystack image');
      }

      // Convert images to raw buffers for processing
      const haystackBuffer = await this.imageToRawBuffer(haystack);
      const needleBuffer = await this.imageToRawBuffer(needle);

      // Perform template matching
      const matches = this.templateMatch(
        haystackBuffer,
        haystack.width,
        haystack.height,
        needleBuffer,
        needle.width,
        needle.height,
        minConfidence
      );

      return matches;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error during image matching');
    }
  }

  /**
   * Converts an Image object to a raw pixel buffer
   * @param image - The Image object to convert
   * @returns Promise resolving to a Uint8Array of raw pixel data
   */
  private async imageToRawBuffer(image: Image): Promise<Uint8Array> {
    try {
      // Create a sharp instance from the image data
      const sharpImage = sharp(image.data, {
        raw: {
          width: image.width,
          height: image.height,
          channels: image.channels as Channels,
        },
      });

      // Convert to raw grayscale for simpler matching
      const rawBuffer = await sharpImage.grayscale().raw().toBuffer();

      return new Uint8Array(rawBuffer);
    } catch (error) {
      throw new Error(
        `Failed to convert image to raw buffer: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Performs template matching using Normalized Cross-Correlation (NCC)
   * @param haystackBuffer - Raw pixel data of the haystack image
   * @param haystackWidth - Width of the haystack image
   * @param haystackHeight - Height of the haystack image
   * @param needleBuffer - Raw pixel data of the needle image
   * @param needleWidth - Width of the needle image
   * @param needleHeight - Height of the needle image
   * @param minConfidence - Minimum confidence threshold for matches
   * @returns Array of MatchResults for all matches above the confidence threshold
   */
  private templateMatch(
    haystackBuffer: Uint8Array,
    haystackWidth: number,
    haystackHeight: number,
    needleBuffer: Uint8Array,
    needleWidth: number,
    needleHeight: number,
    minConfidence: number
  ): MatchResult<Region>[] {
    const matches: MatchResult<Region>[] = [];

    // Calculate the searchable area
    const maxX = haystackWidth - needleWidth;
    const maxY = haystackHeight - needleHeight;

    // Precompute needle statistics for NCC
    const needleMean = this.calculateMean(needleBuffer);
    const needleStdDev = this.calculateStdDev(needleBuffer, needleMean);

    // If needle has zero standard deviation, it's a uniform image
    if (needleStdDev === 0) {
      // For uniform images, we can't use NCC, so we'll use a simpler approach
      return this.findUniformMatches(
        haystackBuffer,
        haystackWidth,
        haystackHeight,
        needleBuffer,
        needleWidth,
        needleHeight,
        needleMean,
        minConfidence
      );
    }

    // Iterate through all possible positions in the haystack
    for (let y = 0; y <= maxY; y++) {
      for (let x = 0; x <= maxX; x++) {
        // Extract the current region from the haystack
        const regionBuffer = this.extractRegion(
          haystackBuffer,
          haystackWidth,
          x,
          y,
          needleWidth,
          needleHeight
        );

        // Calculate NCC for this region
        const confidence = this.calculateNCC(regionBuffer, needleBuffer, needleMean, needleStdDev);

        // If confidence meets the threshold, add to results
        if (confidence >= minConfidence) {
          matches.push(new MatchResult(confidence, new Region(x, y, needleWidth, needleHeight)));
        }
      }
    }

    return matches;
  }

  /**
   * Finds matches for uniform (single color) needle images
   * @param haystackBuffer - Raw pixel data of the haystack image
   * @param haystackWidth - Width of the haystack image
   * @param haystackHeight - Height of the haystack image
   * @param needleBuffer - Raw pixel data of the needle image
   * @param needleWidth - Width of the needle image
   * @param needleHeight - Height of the needle image
   * @param needleValue - The uniform value of the needle image
   * @param minConfidence - Minimum confidence threshold for matches
   * @returns Array of MatchResults for uniform matches
   */
  private findUniformMatches(
    haystackBuffer: Uint8Array,
    haystackWidth: number,
    haystackHeight: number,
    needleBuffer: Uint8Array,
    needleWidth: number,
    needleHeight: number,
    needleValue: number,
    minConfidence: number
  ): MatchResult<Region>[] {
    const matches: MatchResult<Region>[] = [];
    const maxX = haystackWidth - needleWidth;
    const maxY = haystackHeight - needleHeight;

    for (let y = 0; y <= maxY; y++) {
      for (let x = 0; x <= maxX; x++) {
        // Check if the entire region matches the needle value
        let allMatch = true;

        for (let j = 0; j < needleHeight && allMatch; j++) {
          for (let i = 0; i < needleWidth && allMatch; i++) {
            const haystackIndex = (y + j) * haystackWidth + (x + i);
            if (haystackBuffer[haystackIndex] !== needleValue) {
              allMatch = false;
            }
          }
        }

        // If all pixels match, add to results with full confidence
        if (allMatch) {
          matches.push(new MatchResult(1.0, new Region(x, y, needleWidth, needleHeight)));
        }
      }
    }

    return matches;
  }

  /**
   * Extracts a region from the haystack image buffer
   * @param buffer - The source image buffer
   * @param width - Width of the source image
   * @param x - X coordinate of the region to extract
   * @param y - Y coordinate of the region to extract
   * @param regionWidth - Width of the region to extract
   * @param regionHeight - Height of the region to extract
   * @returns Uint8Array containing the extracted region
   */
  private extractRegion(
    buffer: Uint8Array,
    width: number,
    x: number,
    y: number,
    regionWidth: number,
    regionHeight: number
  ): Uint8Array {
    const regionBuffer = new Uint8Array(regionWidth * regionHeight);

    for (let j = 0; j < regionHeight; j++) {
      const sourceStart = (y + j) * width + x;
      const targetStart = j * regionWidth;

      regionBuffer.set(buffer.subarray(sourceStart, sourceStart + regionWidth), targetStart);
    }

    return regionBuffer;
  }

  /**
   * Calculates the mean value of a pixel buffer
   * @param buffer - The pixel buffer to calculate mean for
   * @returns The mean value of the buffer
   */
  private calculateMean(buffer: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    return sum / buffer.length;
  }

  /**
   * Calculates the standard deviation of a pixel buffer
   * @param buffer - The pixel buffer to calculate standard deviation for
   * @param mean - The precalculated mean of the buffer
   * @returns The standard deviation of the buffer
   */
  private calculateStdDev(buffer: Uint8Array, mean: number): number {
    let sumSq = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSq += Math.pow(buffer[i] - mean, 2);
    }
    return Math.sqrt(sumSq / buffer.length);
  }

  /**
   * Calculates Normalized Cross-Correlation (NCC) between two image regions
   * @param regionBuffer - The region from the haystack image
   * @param needleBuffer - The needle image buffer
   * @param needleMean - Precalculated mean of the needle image
   * @param needleStdDev - Precalculated standard deviation of the needle image
   * @returns NCC value between 0 and 1 representing match confidence
   */
  private calculateNCC(
    regionBuffer: Uint8Array,
    needleBuffer: Uint8Array,
    needleMean: number,
    needleStdDev: number
  ): number {
    // Calculate region statistics
    const regionMean = this.calculateMean(regionBuffer);
    const regionStdDev = this.calculateStdDev(regionBuffer, regionMean);

    // If region has zero standard deviation, handle special case
    if (regionStdDev === 0) {
      return needleStdDev === 0 ? 1.0 : 0.0;
    }

    // Calculate covariance
    let covariance = 0;
    for (let i = 0; i < regionBuffer.length; i++) {
      covariance += (regionBuffer[i] - regionMean) * (needleBuffer[i] - needleMean);
    }
    covariance /= regionBuffer.length;

    // Calculate and return NCC
    const ncc = covariance / (regionStdDev * needleStdDev);

    // Normalize NCC from [-1, 1] to [0, 1]
    return (ncc + 1) / 2;
  }
}

const register = (adapter: InstanceType<typeof DefaultTemplateImageFinder>) => {
  providerRegistry.registerImageFinder(adapter);
};
// Export the ImageFinder interface and implementation
export default { DefaultTemplateImageFinder, register };
