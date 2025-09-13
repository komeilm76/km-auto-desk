import Tesseract, { createWorker, PSM, OEM } from 'tesseract.js';
import sharp, { Channels } from 'sharp';
import { ColorMode, Image } from '@nut-tree-fork/shared';
import { providerRegistry } from '@nut-tree-fork/nut-js';
// ==================== ENUM DEFINITIONS ====================

/**
 * ColorMode enum representing different color modes for images
 */

// ==================== CLASS DEFINITIONS ====================

/**
 * MatchRequest class representing a request to find text within an image
 * @template NEEDLE_TYPE - The type of the needle (TextQuery)
 * @template PROVIDER_DATA_TYPE - Optional additional data for the provider
 */
export class MatchRequest<NEEDLE_TYPE, PROVIDER_DATA_TYPE> {
  /**
   * Creates a new MatchRequest instance
   * @param haystack - The image to search within
   * @param needle - The text query to search for
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
 * MatchResult class representing the result of a text matching operation
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
 * RGBA class representing a color with red, green, blue, and alpha components
 */
export class RGBA {
  /**
   * Creates a new RGBA instance
   * @param R - Red component (0-255)
   * @param G - Green component (0-255)
   * @param B - Blue component (0-255)
   * @param A - Alpha component (0-255)
   */
  constructor(
    public readonly R: number,
    public readonly G: number,
    public readonly B: number,
    public readonly A: number
  ) {}

  /**
   * Converts the color to a string representation
   * @returns String representation of the color in format "rgba(R, G, B, A)"
   */
  toString(): string {
    return `rgba(${this.R}, ${this.G}, ${this.B}, ${this.A / 255})`;
  }

  /**
   * Converts the color to a hexadecimal representation
   * @returns Hexadecimal representation of the color in format "#RRGGBB"
   */
  toHex(): string {
    const toHex = (c: number) => {
      const hex = c.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(this.R)}${toHex(this.G)}${toHex(this.B)}`;
  }
}

/**
 * WindowElementDescription interface describing UI elements for window-based text finding
 */
export interface WindowElementDescription {
  id?: string;
  role?: string;
  type?: string;
  title?: string | RegExp;
  value?: string | RegExp;
  selectedText?: string | RegExp;
}

// ==================== TYPE DEFINITIONS ====================

/**
 * Union type representing different types of queries
 */
type Query =
  | {
      id: string;
      type: 'text';
      by: {
        line: string;
      };
    }
  | {
      id: string;
      type: 'text';
      by: {
        word: string;
      };
    }
  | {
      id: string;
      type: 'window';
      by: {
        title: string | RegExp;
      };
    }
  | {
      id: string;
      type: 'color';
      by: {
        color: RGBA;
      };
    }
  | {
      id: string;
      type: 'window-element';
      by: {
        description: WindowElementDescription;
      };
    };

/**
 * Extract text queries from the Query union type
 */
export type TextQuery = Extract<
  Query,
  {
    type: 'text';
  }
>;

// ==================== TEXT FINDER INTERFACE AND IMPLEMENTATION ====================

/**
 * TextFinderInterface defining the contract for text finding operations
 */
export interface TextFinderInterface {
  /**
   * Finds a single match of the text query in the haystack image
   * @template PROVIDER_DATA_TYPE - Type of additional provider data
   * @param matchRequest - The match request containing haystack image and text query
   * @returns Promise resolving to a MatchResult with the best match found
   */
  findMatch<PROVIDER_DATA_TYPE>(
    matchRequest: MatchRequest<TextQuery, PROVIDER_DATA_TYPE>
  ): Promise<MatchResult<Region>>;

  /**
   * Finds all matches of the text query in the haystack image
   * @template PROVIDER_DATA_TYPE - Type of additional provider data
   * @param matchRequest - The match request containing haystack image and text query
   * @returns Promise resolving to an array of MatchResults for all matches found
   */
  findMatches<PROVIDER_DATA_TYPE>(
    matchRequest: MatchRequest<TextQuery, PROVIDER_DATA_TYPE>
  ): Promise<MatchResult<Region>[]>;
}

/**
 * OCRTextFinder implements TextFinderInterface using Tesseract.js for OCR
 */
export class DefaultAdapter implements TextFinderInterface {
  /**
   * Default minimum confidence threshold for text matches
   */
  readonly DEFAULT_CONFIDENCE = 0.7;

  /**
   * Tesseract.js worker for OCR operations
   */
  worker: Tesseract.Worker | null = null;

  /**
   * Initializes the Tesseract.js worker
   */
  async initializeWorker(): Promise<void> {
    if (!this.worker) {
      this.worker = await createWorker('eng', OEM.LSTM_ONLY, {});
      await this.worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
      });
    }
  }

  /**
   * Terminates the Tesseract.js worker
   */
  async terminateWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Finds a single match of the text query in the haystack image
   * @template PROVIDER_DATA_TYPE - Type of additional provider data
   * @param matchRequest - The match request containing haystack image and text query
   * @returns Promise resolving to a MatchResult with the best match found
   */
  async findMatch<PROVIDER_DATA_TYPE>(
    matchRequest: MatchRequest<TextQuery, PROVIDER_DATA_TYPE>
  ): Promise<MatchResult<Region>> {
    try {
      // Find all matches and return the one with highest confidence
      const matches = await this.findMatches(matchRequest);

      if (matches.length === 0) {
        return new MatchResult(0, new Region(0, 0, 0, 0), new Error('No text matches found'));
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
   * Finds all matches of the text query in the haystack image
   * @template PROVIDER_DATA_TYPE - Type of additional provider data
   * @param matchRequest - The match request containing haystack image and text query
   * @returns Promise resolving to an array of MatchResults for all matches found
   */
  async findMatches<PROVIDER_DATA_TYPE>(
    matchRequest: MatchRequest<TextQuery, PROVIDER_DATA_TYPE>
  ): Promise<MatchResult<Region>[]> {
    const { haystack, needle, confidence } = matchRequest;
    const minConfidence = confidence ?? this.DEFAULT_CONFIDENCE;
    const searchText = 'line' in needle.by ? needle.by.line : needle.by.word;

    try {
      // Initialize the OCR worker
      await this.initializeWorker();

      // Convert image to a format suitable for OCR
      const imageBuffer = await this.prepareImageForOCR(haystack);

      // Perform OCR on the image

      const { data } = await (this.worker as Tesseract.Worker).recognize(
        imageBuffer,
        {},
        { blocks: true }
      );

      // Find text matches in the OCR results
      const matches = this.findTextInOCRResults(data, searchText, minConfidence);

      return matches;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error during text recognition');
    }
  }

  /**
   * Prepares an image for OCR processing
   * @param image - The image to prepare
   * @returns Buffer containing the processed image
   */
  async prepareImageForOCR(image: Image): Promise<Buffer> {
    try {
      // Convert to RGB if needed (Tesseract expects RGB)
      const rgbImage = image.colorMode === ColorMode.BGR ? await image.toRGB() : image;

      // Use sharp to enhance the image for better OCR results
      const processedBuffer = await sharp(rgbImage.data, {
        raw: {
          width: rgbImage.width,
          height: rgbImage.height,
          channels: rgbImage.channels as Channels,
        },
      })
        .normalize() // Enhance contrast
        .grayscale() // Convert to grayscale
        .png() // Convert to PNG format
        .toBuffer();

      return processedBuffer;
    } catch (error) {
      throw new Error(
        `Failed to prepare image for OCR: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Finds text in OCR results and returns matching regions
   * @param ocrData - OCR result data from Tesseract.js
   * @param searchText - The text to search for
   * @param minConfidence - Minimum confidence threshold for matches
   * @returns Array of MatchResults for all text matches found
   */
  findTextInOCRResults(
    ocrData: any,
    searchText: string,
    minConfidence: number
  ): MatchResult<Region>[] {
    console.log('ocrData', ocrData);

    const matches: MatchResult<Region>[] = [];
    const searchTextLower = searchText.toLowerCase();

    // Check if we have text elements in the OCR data
    if (!ocrData || !ocrData.words || !Array.isArray(ocrData.words)) {
      return matches;
    }

    // Search through all words found by OCR
    for (const word of ocrData.words) {
      if (!word.text || word.confidence < minConfidence * 100) continue;

      const wordTextLower = word.text.toLowerCase();

      // Check if this word matches our search text
      if (wordTextLower.includes(searchTextLower)) {
        // Create a region for the matched text
        const region = new Region(
          word.bbox.x0,
          word.bbox.y0,
          word.bbox.x1 - word.bbox.x0,
          word.bbox.y1 - word.bbox.y0
        );

        // Calculate confidence (convert from 0-100 to 0-1 scale)
        const confidence = word.confidence / 100;

        matches.push(new MatchResult(confidence, region));
      }
    }

    // If no direct word matches found, try to find text in lines
    if (matches.length === 0 && ocrData.lines && Array.isArray(ocrData.lines)) {
      for (const line of ocrData.lines) {
        if (!line.text || line.confidence < minConfidence * 100) continue;

        const lineTextLower = line.text.toLowerCase();

        // Check if this line contains our search text
        if (lineTextLower.includes(searchTextLower)) {
          // Create a region for the matched line
          const region = new Region(
            line.bbox.x0,
            line.bbox.y0,
            line.bbox.x1 - line.bbox.x0,
            line.bbox.y1 - line.bbox.y0
          );

          // Calculate confidence (convert from 0-100 to 0-1 scale)
          const confidence = line.confidence / 100;

          matches.push(new MatchResult(confidence, region));
        }
      }
    }

    return matches;
  }

  /**
   * Cleans up resources when the TextFinder is no longer needed
   */
  async cleanup(): Promise<void> {
    await this.terminateWorker();
  }
}

// ==================== ADDITIONAL TEXT FINDER IMPLEMENTATIONS ====================

/**
 * SimpleTextFinder implements a basic text finder for demonstration purposes
 * This implementation uses a simpler approach without external OCR dependencies
 */
// export class SimpleTextFinder implements TextFinderInterface {
//   /**
//    * Default minimum confidence threshold for text matches
//    */
//   private readonly DEFAULT_CONFIDENCE = 0.7;

//   /**
//    * Finds a single match of the text query in the haystack image
//    * @template PROVIDER_DATA_TYPE - Type of additional provider data
//    * @param matchRequest - The match request containing haystack image and text query
//    * @returns Promise resolving to a MatchResult with the best match found
//    */
//   async findMatch<PROVIDER_DATA_TYPE>(
//     matchRequest: MatchRequest<TextQuery, PROVIDER_DATA_TYPE>
//   ): Promise<MatchResult<Region>> {
//     // Simple implementation that returns a mock result
//     // In a real implementation, this would use proper text detection
//     return new MatchResult(0.8, new Region(100, 100, 200, 50));
//   }

//   /**
//    * Finds all matches of the text query in the haystack image
//    * @template PROVIDER_DATA_TYPE - Type of additional provider data
//    * @param matchRequest - The match request containing haystack image and text query
//    * @returns Promise resolving to an array of MatchResults for all matches found
//    */
//   async findMatches<PROVIDER_DATA_TYPE>(
//     matchRequest: MatchRequest<TextQuery, PROVIDER_DATA_TYPE>
//   ): Promise<MatchResult<Region>[]> {
//     // Simple implementation that returns mock results
//     // In a real implementation, this would use proper text detection
//     const { needle } = matchRequest;
//     const searchText = 'line' in needle.by ? needle.by.line : needle.by.word;

//     // Return multiple mock results for demonstration
//     return [
//       new MatchResult(0.8, new Region(100, 100, 200, 50)),
//       new MatchResult(0.7, new Region(300, 200, 150, 40)),
//     ];
//   }
// }

// ==================== HELPER FUNCTIONS ====================

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

// ==================== USAGE EXAMPLES ====================

/**
 * Example usage of the TextFinder
 */
async function exampleUsage(): Promise<void> {
  try {
    // Create a TextFinder instance
    const textFinder = new DefaultAdapter();

    // Create a sample image (in a real scenario, this would be an actual image)
    const sampleImage = new Image(
      800,
      600,
      Buffer.alloc(800 * 600 * 3), // Empty buffer for demonstration
      3,
      'sample',
      24,
      800 * 3,
      ColorMode.RGB
    );

    // Create a text query to search for a word
    const wordQuery: TextQuery = {
      id: 'search-word',
      type: 'text',
      by: { word: 'Hello' },
    };

    // Create a match request
    const matchRequest = new MatchRequest(
      sampleImage,
      wordQuery,
      0.7 // Minimum confidence
    );

    // Find a single match
    const matchResult = await textFinder.findMatch(matchRequest);
    console.log(
      `Found match with confidence ${matchResult.confidence} at ${matchResult.location.toString()}`
    );

    // Find all matches
    const matchResults = await textFinder.findMatches(matchRequest);
    matchResults.forEach((result, index) => {
      console.log(
        `Match ${index + 1}: confidence ${result.confidence} at ${result.location.toString()}`
      );
    });

    // Clean up resources
    await textFinder.cleanup();
  } catch (error) {
    console.error('Error in text finder example:', error);
  }
}

// Execute the example
exampleUsage().catch(console.error);

const register = (adapter: InstanceType<typeof DefaultAdapter>) => {
  providerRegistry.registerTextFinder(adapter);
};

// Export the TextFinder interface and implementations
export default { DefaultAdapter, register };
