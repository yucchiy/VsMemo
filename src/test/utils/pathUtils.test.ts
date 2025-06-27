import * as assert from 'assert';
import { normalizePath, joinPaths } from '../../utils/pathUtils';

suite('pathUtils', () => {
  test('normalizePath should normalize Windows-style paths', () => {
    const windowsPath = 'folder\\subfolder\\file.txt';
    assert.strictEqual(normalizePath(windowsPath), 'folder/subfolder/file.txt');
  });

  test('normalizePath should handle Unix-style paths', () => {
    const unixPath = 'folder/subfolder/file.txt';
    assert.strictEqual(normalizePath(unixPath), 'folder/subfolder/file.txt');
  });

  test('joinPaths should join multiple path segments', () => {
    const result = joinPaths('folder', 'subfolder', 'file.txt');
    assert.strictEqual(result, 'folder/subfolder/file.txt');
  });

  test('joinPaths should handle empty segments', () => {
    const result = joinPaths('folder', '', 'file.txt');
    assert.strictEqual(result, 'folder/file.txt');
  });

  test('joinPaths should normalize result', () => {
    const result = joinPaths('folder\\subfolder', 'file.txt');
    assert.strictEqual(result, 'folder/subfolder/file.txt');
  });
});