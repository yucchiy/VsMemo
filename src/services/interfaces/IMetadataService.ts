import { MemoMetadata, RawFrontmatter, MetadataSchema } from '../../models/MemoMetadata';

/**
 * Service interface for metadata management
 */
export interface IMetadataService {
  /**
   * Parse frontmatter from content and classify into system/special/user metadata
   * @param content The full content of the memo file
   * @returns Parsed and classified metadata
   */
  extractMetadata(content: string): MemoMetadata | null;

  /**
   * Extract raw frontmatter from content
   * @param content The full content of the memo file
   * @returns Raw frontmatter object or null if no frontmatter
   */
  extractRawFrontmatter(content: string): RawFrontmatter | null;

  /**
   * Classify raw frontmatter into system/special/user metadata
   * @param frontmatter Raw frontmatter object
   * @returns Classified metadata
   */
  classifyFrontmatter(frontmatter: RawFrontmatter): MemoMetadata;

  /**
   * Serialize metadata back to frontmatter string
   * @param metadata The metadata to serialize
   * @returns Frontmatter string (without surrounding ---)
   */
  serializeMetadata(metadata: MemoMetadata): string;

  /**
   * Merge metadata from template and user input
   * Template metadata takes precedence for system properties
   * User input takes precedence for user properties
   * @param template Template metadata (partial)
   * @param userInput User input metadata (partial)
   * @returns Merged metadata
   */
  mergeMetadata(template: Partial<MemoMetadata>, userInput: Partial<MemoMetadata>): MemoMetadata;

  /**
   * Validate metadata against schema
   * @param metadata The metadata to validate
   * @param schema Optional schema for user metadata validation
   * @returns Validation result with any errors
   */
  validateMetadata(metadata: MemoMetadata, schema?: Record<string, MetadataSchema>): ValidationResult;
}

/**
 * Result of metadata validation
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  type: 'missing_required' | 'invalid_type' | 'invalid_value' | 'unknown_field';
}