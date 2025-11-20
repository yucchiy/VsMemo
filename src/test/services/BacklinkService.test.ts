import * as assert from 'assert';
import { BacklinkService } from '../../services/implementations/BacklinkService';
import { IFileService, FileStats } from '../../services/interfaces/IFileService';
import { IConfigService } from '../../services/interfaces/IConfigService';
import { MemoConfig } from '../../models/MemoConfig';

class MockFileService implements IFileService {
  private files = new Map<string, string>();

  async exists(path: string): Promise<boolean> {
    // Check if it's a file
    if (this.files.has(path)) {
      return true;
    }

    // Check if it's a directory (any file starts with this path + /)
    const dirPath = path.endsWith('/') ? path : path + '/';
    for (const [filePath] of this.files) {
      if (filePath.startsWith(dirPath)) {
        return true;
      }
    }

    return false;
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async deleteFile(path: string): Promise<void> {
    this.files.delete(path);
  }

  async createDirectory(path: string): Promise<void> {
    // Mock implementation
  }

  async openTextDocument(path: string): Promise<void> {
    // Mock implementation
  }

  async showTextDocument(path: string): Promise<void> {
    // Mock implementation
  }

  async listFiles(dirPath: string, extensions: string[]): Promise<string[]> {
    const result: string[] = [];
    const normalizedDirPath = dirPath.endsWith('/') ? dirPath : dirPath + '/';
    for (const [filePath] of this.files) {
      if (filePath.startsWith(normalizedDirPath) || filePath.startsWith(dirPath)) {
        const ext = filePath.substring(filePath.lastIndexOf('.'));
        if (extensions.includes(ext)) {
          result.push(filePath);
        }
      }
    }
    return result;
  }

  async openFile(path: string): Promise<void> {
    // Mock implementation
  }

  async readDirectory(dirPath: string): Promise<string[]> {
    const result: string[] = [];
    const normalizedDirPath = dirPath.endsWith('/') ? dirPath : dirPath + '/';

    // Find all files in the given directory
    for (const [filePath] of this.files) {
      if (filePath.startsWith(normalizedDirPath)) {
        const relativePath = filePath.substring(normalizedDirPath.length);
        const firstSlash = relativePath.indexOf('/');

        if (firstSlash === -1) {
          // It's a file in this directory
          result.push(relativePath);
        } else {
          // It's in a subdirectory
          const subdir = relativePath.substring(0, firstSlash);
          if (!result.includes(subdir)) {
            result.push(subdir);
          }
        }
      }
    }

    return result;
  }

  async getStats(path: string): Promise<FileStats> {
    // Check if it's a directory by looking for files that start with this path
    const normalizedPath = path.endsWith('/') ? path : path + '/';
    let isDirectory = false;

    for (const [filePath] of this.files) {
      if (filePath.startsWith(normalizedPath)) {
        isDirectory = true;
        break;
      }
    }

    return {
      lastModified: new Date(),
      isDirectory: isDirectory && !this.files.has(path)
    };
  }

  // Helper methods for testing
  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  clearFiles(): void {
    this.files.clear();
  }
}

class MockConfigService implements IConfigService {
  private config: MemoConfig;

  constructor(config?: Partial<MemoConfig>) {
    this.config = {
      baseDir: 'memos',
      fileExtensions: ['.md', '.markdown'],
      defaultExtension: '.md',
      memoTypes: [],
      ...config
    };
  }

  async loadConfig(): Promise<MemoConfig> {
    return this.config;
  }

  setConfig(config: Partial<MemoConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

suite('BacklinkService', () => {
  let mockFileService: MockFileService;
  let mockConfigService: MockConfigService;
  let backlinkService: BacklinkService;
  const workspaceRoot = '/test/workspace';

  setup(() => {
    mockFileService = new MockFileService();
    mockConfigService = new MockConfigService();
    backlinkService = new BacklinkService(mockFileService, mockConfigService, workspaceRoot);
  });

  suite('buildIndex', () => {
    test('should build index for files with backlinks', async () => {
      // Arrange
      mockFileService.setFile('/test/workspace/memos/file1.md', `
# File 1
This file links to [file2](./file2.md)
`);

      mockFileService.setFile('/test/workspace/memos/file2.md', `# File 2`);
      mockFileService.setFile('/test/workspace/memos/file3.md', `# File 3`);

      await backlinkService.buildIndex();

      // Assert that file2.md has backlinks from file1.md
      const backlinks = await backlinkService.getBacklinks('/test/workspace/memos/file2.md');
      assert.strictEqual(backlinks.length, 1);
      assert.strictEqual(backlinks[0].sourceFile, '/test/workspace/memos/file1.md');
      assert.ok(backlinks[0].context.includes('file2.md'));

      // Assert that file1.md and file3.md have no backlinks
      const backlinks1 = await backlinkService.getBacklinks('/test/workspace/memos/file1.md');
      assert.strictEqual(backlinks1.length, 0);

      const backlinks3 = await backlinkService.getBacklinks('/test/workspace/memos/file3.md');
      assert.strictEqual(backlinks3.length, 0);
    });

    test('should handle files with no backlinks', async () => {
      mockFileService.setFile('/test/workspace/memos/orphan.md', 'This file has no backlinks');

      await backlinkService.buildIndex();

      const backlinks = await backlinkService.getBacklinks('/test/workspace/memos/orphan.md');
      assert.strictEqual(backlinks.length, 0);
    });

    test('should handle invalid links gracefully', async () => {
      mockFileService.setFile('/test/workspace/memos/invalid.md', `
# Invalid Links
This has a link to nonexistent file [nonexistent](./nonexistent.md)
And an external link [external](https://example.com)
`);

      await backlinkService.buildIndex();

      // Should not throw and should handle gracefully
      const backlinks = await backlinkService.getBacklinks('/test/workspace/memos/invalid.md');
      assert.strictEqual(backlinks.length, 0);
    });
  });

  suite('getOutboundLinks', () => {
    test('should return outbound links from a file', async () => {
      mockFileService.setFile('/test/workspace/memos/source.md', `
# Source File
Link to [File A](./fileA.md) and [File B](./fileB.md)
`);

      mockFileService.setFile('/test/workspace/memos/fileA.md', '# File A');
      mockFileService.setFile('/test/workspace/memos/fileB.md', '# File B');

      await backlinkService.buildIndex();

      const outboundLinks = await backlinkService.getOutboundLinks('/test/workspace/memos/source.md');
      assert.strictEqual(outboundLinks.length, 2);

      const linkPaths = outboundLinks.map(link => link.targetFile);
      assert.ok(linkPaths.includes('/test/workspace/memos/fileA.md'));
      assert.ok(linkPaths.includes('/test/workspace/memos/fileB.md'));
    });

    test('should return empty array for file with no outbound links', async () => {
      mockFileService.setFile('/test/workspace/memos/nolinks.md', '# No Links');

      await backlinkService.buildIndex();

      const outboundLinks = await backlinkService.getOutboundLinks('/test/workspace/memos/nolinks.md');
      assert.strictEqual(outboundLinks.length, 0);
    });
  });

  suite('getOrphanedFiles', () => {
    test('should identify files with no incoming backlinks', async () => {
      mockFileService.setFile('/test/workspace/memos/connected.md', 'Links to [orphan](./orphan.md)');
      mockFileService.setFile('/test/workspace/memos/orphan.md', '# Orphan');
      mockFileService.setFile('/test/workspace/memos/another-orphan.md', '# Another Orphan');

      await backlinkService.buildIndex();

      const orphanedFiles = await backlinkService.getOrphanedFiles();
      assert.strictEqual(orphanedFiles.length, 1);
      assert.ok(orphanedFiles[0].includes('another-orphan.md'));
    });

    test('should return empty array when all files are connected', async () => {
      mockFileService.setFile('/test/workspace/memos/file1.md', 'Links to [file2](./file2.md)');
      mockFileService.setFile('/test/workspace/memos/file2.md', 'Links to [file1](./file1.md)');

      await backlinkService.buildIndex();

      const orphanedFiles = await backlinkService.getOrphanedFiles();
      assert.strictEqual(orphanedFiles.length, 0);
    });
  });

  suite('getLinkStatistics', () => {
    test('should calculate correct statistics', async () => {
      mockFileService.setFile('/test/workspace/memos/hub.md', `
# Hub
Links to [file1](./file1.md), [file2](./file2.md), [file3](./file3.md)
`);
      mockFileService.setFile('/test/workspace/memos/file1.md', 'Links to [file2](./file2.md)');
      mockFileService.setFile('/test/workspace/memos/file2.md', '# File 2');
      mockFileService.setFile('/test/workspace/memos/file3.md', '# File 3');
      mockFileService.setFile('/test/workspace/memos/orphan.md', '# Orphan');

      await backlinkService.buildIndex();

      const stats = await backlinkService.getLinkStatistics();
      // totalFiles is the count of files that are linked to (have incoming links)
      // In this test: file1.md, file2.md, file3.md are linked to
      // hub.md and orphan.md are not linked to by any other files
      assert.strictEqual(stats.totalFiles, 3);
      assert.strictEqual(stats.totalLinks, 4);
      assert.strictEqual(typeof stats.averageLinksPerFile, 'number');
      assert.ok(Array.isArray(stats.mostLinkedFiles));
      assert.ok(stats.mostLinkedFiles.length > 0);
    });

    test('should handle empty workspace', async () => {
      await backlinkService.buildIndex();

      const stats = await backlinkService.getLinkStatistics();
      assert.strictEqual(stats.totalFiles, 0);
      assert.strictEqual(stats.totalLinks, 0);
      assert.strictEqual(stats.averageLinksPerFile, 0);
      assert.ok(Array.isArray(stats.mostLinkedFiles));
      assert.strictEqual(stats.mostLinkedFiles.length, 0);
    });
  });

  suite('error handling', () => {
    test('should handle file read errors gracefully', async () => {
      // Override readFile to throw an error for a specific file
      const originalReadFile = mockFileService.readFile;
      mockFileService.readFile = async (path: string) => {
        if (path.includes('error')) {
          throw new Error('File read error');
        }
        return originalReadFile.call(mockFileService, path);
      };

      mockFileService.setFile('/test/workspace/memos/error.md', 'content');
      mockFileService.setFile('/test/workspace/memos/good.md', 'good content');

      // Should not throw and should handle the error gracefully
      await assert.doesNotReject(async () => {
        await backlinkService.buildIndex();
      });

      const backlinks = await backlinkService.getBacklinks('/test/workspace/memos/error.md');
      assert.strictEqual(backlinks.length, 0);
    });
  });
});