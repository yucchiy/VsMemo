import {
  IMetadataService,
  ValidationResult,
  ValidationError
} from '../interfaces/IMetadataService';
import {
  MemoMetadata,
  RawFrontmatter,
  MetadataSchema,
  SystemMetadata,
  SpecialMetadata,
  isSystemMetadataKey,
  isSpecialMetadataKey
} from '../../models/MemoMetadata';

export class MetadataService implements IMetadataService {
  /**
   * Extract metadata from content
   */
  extractMetadata(content: string): MemoMetadata | null {
    const rawFrontmatter = this.extractRawFrontmatter(content);
    if (!rawFrontmatter) {
      return null;
    }

    return this.classifyFrontmatter(rawFrontmatter);
  }

  /**
   * Extract raw frontmatter from content
   */
  extractRawFrontmatter(content: string): RawFrontmatter | null {
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return null;
    }

    const frontmatterText = frontmatterMatch[1];
    const frontmatter: RawFrontmatter = {};

    // Parse YAML-like frontmatter
    for (const line of frontmatterText.split('\n')) {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value: any = match[2].trim();

        // Parse arrays (simple format: [item1, item2])
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value
            .slice(1, -1)
            .split(',')
            .map((item: string) => item.trim())
            .filter((item: string) => item.length > 0);
        }
        // Parse booleans
        else if (value === 'true') {
          value = true;
        }
        else if (value === 'false') {
          value = false;
        }
        // Parse numbers
        else if (/^\d+$/.test(value)) {
          value = parseInt(value, 10);
        }
        else if (/^\d+\.\d+$/.test(value)) {
          value = parseFloat(value);
        }

        frontmatter[key] = value;
      }
    }

    return frontmatter;
  }

  /**
   * Classify frontmatter into system/special/user metadata
   */
  classifyFrontmatter(frontmatter: RawFrontmatter): MemoMetadata {
    const system: Partial<SystemMetadata> = {};
    const special: SpecialMetadata = {};
    const user: Record<string, any> = {};

    for (const [key, value] of Object.entries(frontmatter)) {
      if (isSystemMetadataKey(key)) {
        // System metadata
        system[key] = value;
      } else if (isSpecialMetadataKey(key)) {
        // Special metadata
        if (key === 'tags' && Array.isArray(value)) {
          special.tags = value;
        } else if (key === 'title' && typeof value === 'string') {
          special.title = value;
        }
      } else {
        // User metadata
        user[key] = value;
      }
    }

    // Ensure required system metadata
    if (!system.type) {
      throw new Error('Missing required system metadata: type');
    }

    return {
      system: system as SystemMetadata,
      special,
      user
    };
  }

  /**
   * Serialize metadata to frontmatter string
   */
  serializeMetadata(metadata: MemoMetadata): string {
    const lines: string[] = [];

    // System metadata first
    for (const [key, value] of Object.entries(metadata.system)) {
      if (value !== undefined) {
        lines.push(`${key}: ${this.formatValue(value)}`);
      }
    }

    // Special metadata
    if (metadata.special.title) {
      lines.push(`title: ${this.formatValue(metadata.special.title)}`);
    }
    if (metadata.special.tags && metadata.special.tags.length > 0) {
      lines.push(`tags: [${metadata.special.tags.join(', ')}]`);
    }

    // User metadata
    for (const [key, value] of Object.entries(metadata.user)) {
      if (value !== undefined) {
        lines.push(`${key}: ${this.formatValue(value)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format a value for YAML
   */
  private formatValue(value: any): string {
    if (typeof value === 'string') {
      // Quote if contains special characters
      if (value.includes(':') || value.includes('#') || value.includes('\n')) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    } else if (Array.isArray(value)) {
      return `[${value.join(', ')}]`;
    } else {
      return String(value);
    }
  }

  /**
   * Merge metadata from template and user input
   */
  mergeMetadata(template: Partial<MemoMetadata>, userInput: Partial<MemoMetadata>): MemoMetadata {
    // Start with template system metadata (takes precedence)
    const system: SystemMetadata = {
      ...(template.system || {}),
      ...(userInput.system || {})
    } as SystemMetadata;

    // Ensure required system metadata
    if (!system.type) {
      throw new Error('Missing required system metadata: type');
    }

    // Merge special metadata (user input takes precedence)
    const special: SpecialMetadata = {
      ...(template.special || {}),
      ...(userInput.special || {})
    };

    // Merge user metadata (user input takes precedence)
    const user: Record<string, any> = {
      ...(template.user || {}),
      ...(userInput.user || {})
    };

    return {
      system,
      special,
      user
    };
  }

  /**
   * Validate metadata against schema
   */
  validateMetadata(metadata: MemoMetadata, schema?: Record<string, MetadataSchema>): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate system metadata
    if (!metadata.system.type) {
      errors.push({
        field: 'type',
        message: 'Required system field "type" is missing',
        type: 'missing_required'
      });
    }

    // Validate special metadata
    if (metadata.special.tags && !Array.isArray(metadata.special.tags)) {
      errors.push({
        field: 'tags',
        message: 'Tags must be an array',
        type: 'invalid_type'
      });
    }

    // Validate user metadata against schema if provided
    if (schema) {
      // Check required fields
      for (const [field, fieldSchema] of Object.entries(schema)) {
        if (fieldSchema.required && !(field in metadata.user)) {
          errors.push({
            field,
            message: `Required field "${field}" is missing`,
            type: 'missing_required'
          });
        }
      }

      // Validate field types
      for (const [field, value] of Object.entries(metadata.user)) {
        const fieldSchema = schema[field];
        if (fieldSchema) {
          const valid = this.validateFieldType(value, fieldSchema.type);
          if (!valid) {
            errors.push({
              field,
              message: `Field "${field}" must be of type ${fieldSchema.type}`,
              type: 'invalid_type'
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate field type
   */
  private validateFieldType(value: any, type: MetadataSchema['type']): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        // Accept string dates or Date objects
        return typeof value === 'string' || value instanceof Date;
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return false;
    }
  }
}