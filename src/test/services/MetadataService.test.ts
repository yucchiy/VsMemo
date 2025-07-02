import * as assert from 'assert';
import { MetadataService } from '../../services/implementations/MetadataService';
import { MemoMetadata, MetadataSchema } from '../../models/MemoMetadata';

suite('MetadataService', () => {
  let metadataService: MetadataService;

  setup(() => {
    metadataService = new MetadataService();
  });

  suite('extractRawFrontmatter', () => {
    test('should extract frontmatter from content', () => {
      const content = `---
title: Test Title
type: daily
author: John Doe
tags: [test, demo]
---

# Test Content`;

      const frontmatter = metadataService.extractRawFrontmatter(content);

      assert.ok(frontmatter);
      assert.strictEqual(frontmatter.title, 'Test Title');
      assert.strictEqual(frontmatter.type, 'daily');
      assert.strictEqual(frontmatter.author, 'John Doe');
      assert.ok(Array.isArray(frontmatter.tags));
      assert.deepStrictEqual(frontmatter.tags, ['test', 'demo']);
    });

    test('should return null for content without frontmatter', () => {
      const content = `# Test Content

This is just regular markdown.`;

      const frontmatter = metadataService.extractRawFrontmatter(content);

      assert.strictEqual(frontmatter, null);
    });

    test('should parse different data types', () => {
      const content = `---
string_field: Hello World
number_field: 42
float_field: 3.14
boolean_true: true
boolean_false: false
array_field: [one, two, three]
---

Content`;

      const frontmatter = metadataService.extractRawFrontmatter(content);

      assert.ok(frontmatter);
      assert.strictEqual(frontmatter.string_field, 'Hello World');
      assert.strictEqual(frontmatter.number_field, 42);
      assert.strictEqual(frontmatter.float_field, 3.14);
      assert.strictEqual(frontmatter.boolean_true, true);
      assert.strictEqual(frontmatter.boolean_false, false);
      assert.deepStrictEqual(frontmatter.array_field, ['one', 'two', 'three']);
    });
  });

  suite('classifyFrontmatter', () => {
    test('should classify system metadata correctly', () => {
      const frontmatter = {
        type: 'daily',
        path: 'test.md',
        baseDir: 'notes'
      };

      const metadata = metadataService.classifyFrontmatter(frontmatter);

      assert.strictEqual(metadata.system.type, 'daily');
      assert.strictEqual(metadata.system.path, 'test.md');
      assert.strictEqual(metadata.system.baseDir, 'notes');
    });

    test('should classify special metadata correctly', () => {
      const frontmatter = {
        type: 'daily',
        title: 'My Daily Note',
        tags: ['work', 'planning']
      };

      const metadata = metadataService.classifyFrontmatter(frontmatter);

      assert.strictEqual(metadata.special.title, 'My Daily Note');
      assert.deepStrictEqual(metadata.special.tags, ['work', 'planning']);
    });

    test('should classify user metadata correctly', () => {
      const frontmatter = {
        type: 'daily',
        author: 'John Doe',
        priority: 5,
        project: 'VsMemo Development'
      };

      const metadata = metadataService.classifyFrontmatter(frontmatter);

      assert.strictEqual(metadata.user.author, 'John Doe');
      assert.strictEqual(metadata.user.priority, 5);
      assert.strictEqual(metadata.user.project, 'VsMemo Development');
    });

    test('should throw error for missing required type', () => {
      const frontmatter = {
        title: 'Test',
        author: 'John Doe'
      };

      assert.throws(() => {
        metadataService.classifyFrontmatter(frontmatter);
      }, /Missing required system metadata: type/);
    });
  });

  suite('serializeMetadata', () => {
    test('should serialize metadata to frontmatter string', () => {
      const metadata: MemoMetadata = {
        system: {
          type: 'daily'
        },
        special: {
          title: 'Test Note',
          tags: ['test', 'demo']
        },
        user: {
          author: 'John Doe',
          priority: 3
        }
      };

      const serialized = metadataService.serializeMetadata(metadata);
      const lines = serialized.split('\n');

      assert.ok(lines.includes('type: daily'));
      assert.ok(lines.includes('title: Test Note'));
      assert.ok(lines.includes('tags: [test, demo]'));
      assert.ok(lines.includes('author: John Doe'));
      assert.ok(lines.includes('priority: 3'));
    });

    test('should handle empty sections', () => {
      const metadata: MemoMetadata = {
        system: {
          type: 'daily'
        },
        special: {},
        user: {}
      };

      const serialized = metadataService.serializeMetadata(metadata);

      assert.strictEqual(serialized, 'type: daily');
    });
  });

  suite('mergeMetadata', () => {
    test('should merge metadata correctly', () => {
      const template: Partial<MemoMetadata> = {
        system: {
          type: 'daily',
          path: 'template.md'
        },
        special: {
          tags: ['template']
        },
        user: {
          author: 'Template Author'
        }
      };

      const userInput: Partial<MemoMetadata> = {
        special: {
          title: 'User Title',
          tags: ['user', 'custom']
        },
        user: {
          author: 'User Author',
          priority: 5
        }
      };

      const merged = metadataService.mergeMetadata(template, userInput);

      assert.strictEqual(merged.system.type, 'daily');
      assert.strictEqual(merged.system.path, 'template.md');
      assert.strictEqual(merged.special.title, 'User Title');
      assert.deepStrictEqual(merged.special.tags, ['user', 'custom']);
      assert.strictEqual(merged.user.author, 'User Author');
      assert.strictEqual(merged.user.priority, 5);
    });
  });

  suite('validateMetadata', () => {
    test('should validate correct metadata', () => {
      const metadata: MemoMetadata = {
        system: {
          type: 'daily'
        },
        special: {
          title: 'Test',
          tags: ['test']
        },
        user: {
          author: 'John Doe'
        }
      };

      const result = metadataService.validateMetadata(metadata);

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors, undefined);
    });

    test('should detect missing required fields', () => {
      const metadata: MemoMetadata = {
        system: {
          type: ''
        } as any,
        special: {},
        user: {}
      };

      const result = metadataService.validateMetadata(metadata);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors);
      assert.strictEqual(result.errors.length, 1);
      assert.strictEqual(result.errors[0].type, 'missing_required');
    });

    test('should validate against schema', () => {
      const metadata: MemoMetadata = {
        system: {
          type: 'daily'
        },
        special: {},
        user: {
          priority: 'high' // Should be number
        }
      };

      const schema: Record<string, MetadataSchema> = {
        priority: {
          name: 'priority',
          type: 'number',
          required: true
        }
      };

      const result = metadataService.validateMetadata(metadata, schema);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors);
      assert.strictEqual(result.errors.length, 1);
      assert.strictEqual(result.errors[0].type, 'invalid_type');
    });
  });

  suite('extractMetadata', () => {
    test('should extract and classify metadata from content', () => {
      const content = `---
type: daily
title: My Daily Note
tags: [work, planning]
author: John Doe
priority: 5
---

# My Daily Note

This is my daily note content.`;

      const metadata = metadataService.extractMetadata(content);

      assert.ok(metadata);
      assert.strictEqual(metadata.system.type, 'daily');
      assert.strictEqual(metadata.special.title, 'My Daily Note');
      assert.deepStrictEqual(metadata.special.tags, ['work', 'planning']);
      assert.strictEqual(metadata.user.author, 'John Doe');
      assert.strictEqual(metadata.user.priority, 5);
    });

    test('should return null for content without frontmatter', () => {
      const content = `# Just a regular markdown file

No frontmatter here.`;

      const metadata = metadataService.extractMetadata(content);

      assert.strictEqual(metadata, null);
    });
  });
});