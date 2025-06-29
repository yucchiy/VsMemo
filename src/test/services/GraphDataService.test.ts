import * as assert from 'assert';
import { GraphDataService, GraphDisplayMode, GraphNode, GraphEdge } from '../../services/implementations/GraphDataService';
import { IBacklinkService, Backlink, OutboundLink } from '../../services/interfaces/IBacklinkService';
import { IFileService, FileStats } from '../../services/interfaces/IFileService';
import { IConfigService } from '../../services/interfaces/IConfigService';
import { MemoConfig } from '../../models/MemoConfig';

class MockBacklinkService implements IBacklinkService {
  private backlinks = new Map<string, Backlink[]>();
  private outboundLinks = new Map<string, OutboundLink[]>();

  async buildIndex(): Promise<void> {
    // Mock implementation
  }

  async getBacklinks(targetFilePath: string): Promise<Backlink[]> {
    return this.backlinks.get(targetFilePath) || [];
  }

  async getOutboundLinks(filePath: string): Promise<OutboundLink[]> {
    return this.outboundLinks.get(filePath) || [];
  }

  async updateFileBacklinks(filePath: string): Promise<void> {
    // Mock implementation
  }

  async removeFileFromIndex(filePath: string): Promise<void> {
    // Mock implementation
  }

  async getOrphanedFiles(): Promise<string[]> {
    return [];
  }

  async getLinkStatistics(): Promise<{
    totalLinks: number;
    totalFiles: number;
    averageLinksPerFile: number;
    mostLinkedFiles: Array<{ file: string; count: number }>;
  }> {
    return {
      totalFiles: 0,
      totalLinks: 0,
      averageLinksPerFile: 0,
      mostLinkedFiles: []
    };
  }

  // Helper methods for testing
  setBacklinks(targetPath: string, backlinks: Backlink[]): void {
    this.backlinks.set(targetPath, backlinks);
  }

  setOutboundLinks(sourcePath: string, outboundLinks: OutboundLink[]): void {
    this.outboundLinks.set(sourcePath, outboundLinks);
  }
}

class MockFileService implements IFileService {
  private files = new Map<string, string>();

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
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
    for (const [filePath] of this.files) {
      if (filePath.startsWith(dirPath)) {
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

  async readDirectory(path: string): Promise<string[]> {
    return [];
  }

  async getStats(path: string): Promise<FileStats> {
    return {
      lastModified: new Date(),
      isDirectory: false
    };
  }

  // Helper methods for testing
  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  getFileCount(): number {
    return this.files.size;
  }
}

class MockConfigService implements IConfigService {
  private config: MemoConfig;

  constructor(config?: Partial<MemoConfig>) {
    this.config = {
      baseDir: 'memos',
      fileExtensions: ['.md', '.markdown'],
      memoTypes: [],
      defaultExtension: '.md',
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

suite('GraphDataService', () => {
  let mockBacklinkService: MockBacklinkService;
  let mockFileService: MockFileService;
  let mockConfigService: MockConfigService;
  let graphDataService: GraphDataService;

  setup(() => {
    mockBacklinkService = new MockBacklinkService();
    mockFileService = new MockFileService();
    mockConfigService = new MockConfigService();
    graphDataService = new GraphDataService(mockBacklinkService, mockFileService, mockConfigService);
  });

  suite('generateGraphData', () => {
    test('should generate graph data in FULL mode', async () => {
      // Arrange
      mockFileService.setFile('/workspace/memos/file1.md', '# File 1');
      mockFileService.setFile('/workspace/memos/file2.md', '# File 2');
      mockFileService.setFile('/workspace/memos/file3.md', '# File 3');

      mockBacklinkService.setOutboundLinks('/workspace/memos/file1.md', [
        { targetFile: '/workspace/memos/file2.md', context: 'link to file2', sourceLine: 1, linkText: 'file2' }
      ]);

      // Act
      const graphData = await graphDataService.generateGraphData('/workspace', GraphDisplayMode.FULL);

      // Assert
      assert.strictEqual(graphData.nodes.length, 3);
      assert.strictEqual(graphData.edges.length, 1);

      const nodeIds = graphData.nodes.map(n => n.id);
      assert.ok(nodeIds.includes('/workspace/memos/file1.md'));
      assert.ok(nodeIds.includes('/workspace/memos/file2.md'));
      assert.ok(nodeIds.includes('/workspace/memos/file3.md'));

      assert.strictEqual(graphData.edges[0].source, '/workspace/memos/file1.md');
      assert.strictEqual(graphData.edges[0].target, '/workspace/memos/file2.md');
    });

    test('should generate graph data in FOCUS mode', async () => {
      // Arrange
      mockFileService.setFile('/workspace/memos/active.md', '# Active');
      mockFileService.setFile('/workspace/memos/connected.md', '# Connected');
      mockFileService.setFile('/workspace/memos/unconnected.md', '# Unconnected');

      mockBacklinkService.setOutboundLinks('/workspace/memos/active.md', [
        { targetFile: '/workspace/memos/connected.md', context: 'link', sourceLine: 1, linkText: 'connected' }
      ]);

      // Act
      const graphData = await graphDataService.generateGraphData(
        '/workspace',
        GraphDisplayMode.FOCUS,
        '/workspace/memos/active.md'
      );

      // Assert
      assert.strictEqual(graphData.nodes.length, 2);
      assert.strictEqual(graphData.edges.length, 1);

      const nodeIds = graphData.nodes.map(n => n.id);
      assert.ok(nodeIds.includes('/workspace/memos/active.md'));
      assert.ok(nodeIds.includes('/workspace/memos/connected.md'));
      assert.ok(!nodeIds.includes('/workspace/memos/unconnected.md'));
    });

    test('should handle empty workspace', async () => {
      // Act
      const graphData = await graphDataService.generateGraphData('/workspace', GraphDisplayMode.FULL);

      // Assert
      assert.strictEqual(graphData.nodes.length, 0);
      assert.strictEqual(graphData.edges.length, 0);
    });

    test('should handle file without connections', async () => {
      // Arrange
      mockFileService.setFile('/workspace/memos/isolated.md', '# Isolated');

      // Act
      const graphData = await graphDataService.generateGraphData('/workspace', GraphDisplayMode.FULL);

      // Assert
      assert.strictEqual(graphData.nodes.length, 1);
      assert.strictEqual(graphData.edges.length, 0);
      assert.strictEqual(graphData.nodes[0].id, '/workspace/memos/isolated.md');
      assert.strictEqual(graphData.nodes[0].label, 'isolated');
    });
  });

  suite('node styling', () => {
    test('getNodeColor should return correct colors', () => {
      const service = graphDataService as any; // Access private methods for testing

      // Test different file extensions
      const mdColor = service.getNodeColor('/test/file.md');
      const markdownColor = service.getNodeColor('/test/file.markdown');

      assert.strictEqual(typeof mdColor, 'string');
      assert.strictEqual(typeof markdownColor, 'string');
      assert.strictEqual(mdColor, markdownColor); // Same extension family should have same color
    });

    test('getNodeSize should calculate correct sizes', () => {
      const service = graphDataService as any; // Access private methods for testing

      // Test size calculation based on connections
      const baseSize = service.getNodeSize(0);
      const connectedSize = service.getNodeSize(5);

      assert.strictEqual(typeof baseSize, 'number');
      assert.strictEqual(typeof connectedSize, 'number');
      assert.ok(connectedSize > baseSize); // More connections should result in larger size
    });
  });
});