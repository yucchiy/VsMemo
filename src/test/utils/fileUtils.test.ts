import * as assert from 'assert';
import { isValidMemoFile, extractFileNameWithoutExtension } from '../../utils/fileUtils';

suite('fileUtils', () => {
  suite('isValidMemoFile', () => {
    test('should return true for .md files', () => {
      assert.strictEqual(isValidMemoFile('test.md', ['.md', '.markdown']), true);
    });

    test('should return true for .markdown files', () => {
      assert.strictEqual(isValidMemoFile('test.markdown', ['.md', '.markdown']), true);
    });

    test('should return false for other extensions', () => {
      assert.strictEqual(isValidMemoFile('test.txt', ['.md', '.markdown']), false);
      assert.strictEqual(isValidMemoFile('test.html', ['.md', '.markdown']), false);
    });

    test('should work with custom extensions', () => {
      assert.strictEqual(isValidMemoFile('test.note', ['.note', '.txt']), true);
      assert.strictEqual(isValidMemoFile('test.md', ['.note', '.txt']), false);
    });

    test('should handle empty extension list', () => {
      assert.strictEqual(isValidMemoFile('test.md', []), false);
    });
  });

  suite('extractFileNameWithoutExtension', () => {
    test('should extract filename without .md extension', () => {
      assert.strictEqual(extractFileNameWithoutExtension('test.md', ['.md', '.markdown']), 'test');
    });

    test('should extract filename without .markdown extension', () => {
      assert.strictEqual(extractFileNameWithoutExtension('test.markdown', ['.md', '.markdown']), 'test');
    });

    test('should return original filename if no matching extension', () => {
      assert.strictEqual(extractFileNameWithoutExtension('test.txt', ['.md', '.markdown']), 'test.txt');
    });

    test('should handle files with multiple dots', () => {
      assert.strictEqual(extractFileNameWithoutExtension('my.file.md', ['.md', '.markdown']), 'my.file');
    });

    test('should work with custom extensions', () => {
      assert.strictEqual(extractFileNameWithoutExtension('test.note', ['.note', '.txt']), 'test');
    });

    test('should handle empty extension list', () => {
      assert.strictEqual(extractFileNameWithoutExtension('test.md', []), 'test.md');
    });
  });
});