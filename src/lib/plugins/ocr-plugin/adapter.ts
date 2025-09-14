import Tesseract, { createWorker, PSM, OEM } from 'tesseract.js';
import sharp, { Channels } from 'sharp';
import { ColorMode, providerRegistry } from '@nut-tree-fork/nut-js';
import { Image } from '@nut-tree-fork/nut-js';
import { TestEvent } from 'node:test/reporters';
// ==================== ENUM DEFINITIONS ====================

// ==================== INTERFACE DEFINITIONS ====================

/**
 * Interface for OCR choice with text and confidence
 */
interface Choice {
  text: string;
  confidence: number;
}

/**
 * Interface for baseline coordinates
 */
interface Baseline {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  has_baseline: boolean;
}

/**
 * Interface for row attributes in OCR
 */
interface RowAttributes {
  ascenders: number;
  descenders: number;
  row_height: number;
}

/**
 * Interface for OCR page results
 */
interface Page {
  blocks: Block[] | null;
  confidence: number;
  oem: string;
  osd: string;
  psm: string;
  text: string;
  version: string;
  hocr: string | null;
  tsv: string | null;
  box: string | null;
  unlv: string | null;
  sd: string | null;
  imageColor: string | null;
  imageGrey: string | null;
  imageBinary: string | null;
  rotateRadians: number | null;
  pdf: number[] | null;
  debug: string | null;
}

/**
 * Interface for OCR block results
 */
interface Block {
  paragraphs: Paragraph[];
  text: string;
  confidence: number;
  bbox: Bbox;
  blocktype: string;
  page: Page;
}

/**
 * Interface for OCR line results
 */
interface Line {
  words: Word[];
  text: string;
  confidence: number;
  baseline: Baseline;
  rowAttributes: RowAttributes;
  bbox: Bbox;
}

/**
 * Interface for OCR paragraph results
 */
interface Paragraph {
  lines: Line[];
  text: string;
  confidence: number;
  bbox: Bbox;
  is_ltr: boolean;
}

/**
 * Interface for OCR word results
 */
interface Word {
  symbols: Symbol[];
  choices: Choice[];
  text: string;
  confidence: number;
  bbox: Bbox;
  font_name: string;
}

/**
 * Interface for OCR symbol results
 */
interface Symbol {
  text: string;
  confidence: number;
  bbox: Bbox;
  is_superscript: boolean;
  is_subscript: boolean;
  is_dropcap: boolean;
}

/**
 * Interface for bounding box coordinates
 */
interface Bbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Interface for Tesseract.js recognize result
 */
interface RecognizeResult {
  jobId: string;
  data: Page;
}

// ==================== CLASS DEFINITIONS ====================

/**
 * Image class representing an image with various properties and methods
 */

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
  worker: null | Tesseract.Worker = null;

  /**
   * Initializes the Tesseract.js worker
   */
  async initializeWorker(): Promise<void> {
    if (!this.worker) {
      this.worker = await Tesseract.createWorker('eng', OEM.LSTM_ONLY);
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
      const result = await (this.worker as Tesseract.Worker).recognize(
        imageBuffer,
        {},
        { blocks: true }
      );

      // Find text matches in the OCR results
      const matches = this.findTextInOCRResults(result.data, searchText, minConfidence);

      return matches;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error during text recognition');
    } finally {
      // Clean up worker to free resources
      await this.terminateWorker();
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
   * @param page - OCR page data from Tesseract.js
   * @param searchText - The text to search for
   * @param minConfidence - Minimum confidence threshold for matches
   * @returns Array of MatchResults for all text matches found
   */
  findTextInOCRResults(
    page: Page,
    searchText: string,
    minConfidence: number
  ): MatchResult<Region>[] {
    const matches: MatchResult<Region>[] = [];
    const searchTextLower = searchText.toLowerCase();

    // Check if we have blocks in the OCR data
    if (!page.blocks || page.blocks.length === 0) {
      return matches;
    }

    // Iterate through all blocks, paragraphs, lines, and words
    for (const block of page.blocks) {
      if (!block.paragraphs) continue;

      for (const paragraph of block.paragraphs) {
        if (!paragraph.lines) continue;

        for (const line of paragraph.lines) {
          if (!line.words) continue;

          for (const word of line.words) {
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

          // Also check the full line text for matches
          if (line.text && line.confidence >= minConfidence * 100) {
            const lineTextLower = line.text.toLowerCase();

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
// async function exampleUsage(): Promise<void> {
//   try {
//     // Create a TextFinder instance
//     const textFinder = new OCRTextFinder();

//     // Create a sample image (in a real scenario, this would be an actual image)
//     const sampleImage = new Image(
//       800,
//       600,
//       Buffer.alloc(800 * 600 * 3), // Empty buffer for demonstration
//       3,
//       'sample',
//       24,
//       800 * 3,
//       ColorMode.RGB
//     );

//     // Create a text query to search for a word
//     const wordQuery: TextQuery = {
//       id: 'search-word',
//       type: 'text',
//       by: { word: 'Hello' },
//     };

//     // Create a match request
//     const matchRequest = new MatchRequest(
//       sampleImage,
//       wordQuery,
//       0.7 // Minimum confidence
//     );

//     // Find a single match
//     const matchResult = await textFinder.findMatch(matchRequest);
//     console.log(
//       `Found match with confidence ${matchResult.confidence} at ${matchResult.location.toString()}`
//     );

//     // Find all matches
//     const matchResults = await textFinder.findMatches(matchRequest);
//     matchResults.forEach((result, index) => {
//       console.log(
//         `Match ${index + 1}: confidence ${result.confidence} at ${result.location.toString()}`
//       );
//     });

//     // Clean up resources
//     await textFinder.cleanup();
//   } catch (error) {
//     console.error('Error in text finder example:', error);
//   }
// }

// // Execute the example
// exampleUsage().catch(console.error);

// Export the TextFinder interface and implementations

const register = (adapter: InstanceType<typeof DefaultAdapter>) => {
  providerRegistry.registerTextFinder(adapter);
};
export default { DefaultAdapter, register };
