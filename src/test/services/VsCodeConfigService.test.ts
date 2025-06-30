import * as assert from 'assert';
import { VsCodeConfigService } from '../../services/implementations/VsCodeConfigService';
import { IFileService, FileStats } from '../../services/interfaces/IFileService';
import { MemoConfig } from '../../models/MemoConfig';

class TestVsCodeConfigService extends VsCodeConfigService {
  private testWorkspaceRoot = '/test/workspace';

  protected getWorkspaceRoot(): string | undefined {
    return this.testWorkspaceRoot;
  }

  setWorkspaceRoot(root: string | undefined): void {
    this.testWorkspaceRoot = root || '/test/workspace';
  }
}

class MockFileService implements IFileService {
  private files = new Map<string, string>();
  private workspaceRoot = '/test/workspace';

  async exists(path: string): Promise<boolean> {
    // Normalize path to handle relative paths from workspace root
    const normalizedPath = path.startsWith('/') ? path : `${this.workspaceRoot}/${path}`;
    return this.files.has(normalizedPath);
  }

  async readFile(path: string): Promise<string> {
    const normalizedPath = path.startsWith('/') ? path : `${this.workspaceRoot}/${path}`;
    const content = this.files.get(normalizedPath);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    const normalizedPath = path.startsWith('/') ? path : `${this.workspaceRoot}/${path}`;
    this.files.set(normalizedPath, content);
  }

  async deleteFile(path: string): Promise<void> {
    const normalizedPath = path.startsWith('/') ? path : `${this.workspaceRoot}/${path}`;
    this.files.delete(normalizedPath);
  }

  async createDirectory(path: string): Promise<void> {
  }

  async openTextDocument(path: string): Promise<void> {
  }

  async showTextDocument(path: string): Promise<void> {
  }

  async listFiles(dirPath: string, extensions: string[]): Promise<string[]> {
    return [];
  }

  async openFile(path: string): Promise<void> {
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

  setFileContent(path: string, content: string): void {
    const normalizedPath = path.startsWith('/') ? path : `${this.workspaceRoot}/${path}`;
    this.files.set(normalizedPath, content);
  }
}

suite('VsCodeConfigService', () => {
  let mockFileService: MockFileService;
  let configService: TestVsCodeConfigService;

  setup(() => {
    mockFileService = new MockFileService();
    configService = new TestVsCodeConfigService(mockFileService);
  });

  suite('loadConfig', () => {
    test('should return default config when file does not exist', async () => {
      const config = await configService.loadConfig();

      assert.strictEqual(config.memoTypes.length, 0);
      assert.strictEqual(config.baseDir, '.');
    });

    test('should handle invalid JSON gracefully', async () => {
      const configPath = '.vsmemo/config.json';
      mockFileService.setFileContent(configPath, 'invalid json');

      const config = await configService.loadConfig();

      assert.strictEqual(config.memoTypes.length, 0);
      assert.strictEqual(config.baseDir, '.');
    });

    test('should handle missing memoTypes property', async () => {
      const configPath = '.vsmemo/config.json';
      mockFileService.setFileContent(configPath, JSON.stringify({ baseDir: 'notes' }));

      const config = await configService.loadConfig();

      // When memoTypes is missing, returns empty array, but baseDir is preserved
      assert.strictEqual(config.memoTypes.length, 0);
      assert.strictEqual(config.baseDir, 'notes');
    });

    test('should handle empty memoTypes array', async () => {
      const configPath = '.vsmemo/config.json';
      mockFileService.setFileContent(configPath, JSON.stringify({ memoTypes: [], baseDir: 'notes' }));

      const config = await configService.loadConfig();

      // When memoTypes is empty, returns empty array
      assert.strictEqual(config.memoTypes.length, 0);
      assert.strictEqual(config.baseDir, 'notes');
    });

    test('should handle invalid memo type objects', async () => {
      const configPath = '.vsmemo/config.json';
      mockFileService.setFileContent(configPath, JSON.stringify({
        memoTypes: [
          { id: 'valid', name: 'Valid', templatePath: 'templatePath.md' },
          { name: 'Missing ID', templatePath: 'template.md' },
          { id: 'missing-name', templatePath: 'template.md' },
          { id: 'missing-templatePath', name: 'Missing Template' },
          null,
          'string'
        ],
        baseDir: 'memos'
      }));

      const config = await configService.loadConfig();

      // When some memo types are invalid, only valid ones are kept
      assert.strictEqual(config.memoTypes.length, 1);
      assert.strictEqual(config.memoTypes[0].id, 'valid');
      assert.strictEqual(config.baseDir, 'memos');
    });

    test('should use valid config when properly formatted', async () => {
      const configPath = '.vsmemo/config.json';
      const validConfig: MemoConfig = {
        memoTypes: [
          { id: 'custom', name: 'Custom Note', templatePath: 'custom.md' }
        ],
        baseDir: 'my-notes',
        fileExtensions: ['.md', '.markdown'],
        defaultExtension: '.md',
        variables: [
          { name: 'PROJECT', description: 'Project name', default: 'Default' }
        ]
      };
      mockFileService.setFileContent(configPath, JSON.stringify(validConfig));

      const config = await configService.loadConfig();

      // Valid config is accepted as-is
      assert.strictEqual(config.memoTypes.length, 1);
      assert.strictEqual(config.memoTypes[0].id, 'custom');
      assert.strictEqual(config.baseDir, 'my-notes');
      assert.ok(config.variables);
      assert.strictEqual(config.variables?.length, 1);
    });

    test('should fix missing baseDir', async () => {
      const configPath = '.vsmemo/config.json';
      mockFileService.setFileContent(configPath, JSON.stringify({
        memoTypes: [
          { id: 'test', name: 'Test', templatePath: 'template.md' }
        ]
      }));

      const config = await configService.loadConfig();

      assert.strictEqual(config.baseDir, '.');
    });

    test('should fix missing fileExtensions', async () => {
      const configPath = '.vsmemo/config.json';
      mockFileService.setFileContent(configPath, JSON.stringify({
        memoTypes: [
          { id: 'test', name: 'Test', templatePath: 'template.md' }
        ],
        baseDir: '.'
      }));

      const config = await configService.loadConfig();

      assert.deepStrictEqual(config.fileExtensions, ['.md', '.markdown']);
      assert.strictEqual(config.defaultExtension, '.md');
    });

    test('should fix invalid fileExtensions', async () => {
      const configPath = '.vsmemo/config.json';
      mockFileService.setFileContent(configPath, JSON.stringify({
        memoTypes: [
          { id: 'test', name: 'Test', templatePath: 'template.md' }
        ],
        baseDir: '.',
        fileExtensions: ['md', 'invalid'],
        defaultExtension: 'md'
      }));

      const config = await configService.loadConfig();

      assert.deepStrictEqual(config.fileExtensions, ['.md', '.markdown']);
      assert.strictEqual(config.defaultExtension, '.md');
    });
  });
});