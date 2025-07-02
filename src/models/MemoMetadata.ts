/**
 * Metadata structure for memo files
 * Separates system-managed, special, and user-defined properties
 */

/**
 * System-managed metadata keys
 * These are reserved for VsMemo internal use
 */
export const SYSTEM_METADATA_KEYS = [
  'type',     // Memo type (automatically set by system)
  'path',     // Template processing only
  'baseDir'   // Template processing only
] as const;

export type SystemMetadataKey = typeof SYSTEM_METADATA_KEYS[number];

/**
 * Special metadata keys
 * These have special handling but are optional
 */
export const SPECIAL_METADATA_KEYS = [
  'tags',     // Tags for search and filtering
  'title'     // Title for priority display
] as const;

export type SpecialMetadataKey = typeof SPECIAL_METADATA_KEYS[number];

/**
 * System-managed metadata
 * Minimal set of properties managed by VsMemo
 */
export interface SystemMetadata {
  type: string;      // Memo type ID (required)
  path?: string;     // For template processing
  baseDir?: string;  // For template processing
}

/**
 * Special metadata with dedicated features
 * Optional but have special handling in the system
 */
export interface SpecialMetadata {
  tags?: string[];   // Tags for search/filter features
  title?: string;    // Priority display in views
}

/**
 * Complete metadata structure for a memo
 */
export interface MemoMetadata {
  // System-managed (minimal)
  system: SystemMetadata;

  // Special handling (optional)
  special: SpecialMetadata;

  // User-defined (completely free)
  user: Record<string, any>;
}

/**
 * Raw frontmatter as parsed from file
 */
export type RawFrontmatter = Record<string, any>;

/**
 * Check if a key is a system metadata key
 */
export function isSystemMetadataKey(key: string): key is SystemMetadataKey {
  return SYSTEM_METADATA_KEYS.includes(key as SystemMetadataKey);
}

/**
 * Check if a key is a special metadata key
 */
export function isSpecialMetadataKey(key: string): key is SpecialMetadataKey {
  return SPECIAL_METADATA_KEYS.includes(key as SpecialMetadataKey);
}

/**
 * Metadata schema definition for validation and UI hints
 */
export interface MetadataSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  description?: string;
  defaultValue?: any;
  required?: boolean;
  icon?: string;  // Icon for display
}

/**
 * Metadata configuration
 */
export interface MetadataConfig {
  // User metadata schema definitions
  userSchema?: Record<string, MetadataSchema>;

  // Display settings for tree view
  treeViewDisplay?: {
    showMetadata?: string[];  // Which metadata to show
    sortBy?: string;          // Sort by this metadata field
  };

  // Future: searchable fields configuration
  searchableFields?: string[];
}