import * as assert from 'assert';
import { VsCodeConfigService } from '../../services/implementations/VsCodeConfigService';
import { IFileService, FileStats } from '../../services/interfaces/IFileService';
import { MemoConfig } from '../../models/MemoConfig';

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
    this.files.set(path, content);
  }

  async createDirectory(path: string): Promise<void> {
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
  let configService: VsCodeConfigService;

  setup(() => {
    mockFileService = new MockFileService();
    configService = new VsCodeConfigService(mockFileService);
  });

  suite('loadConfig', () => {
    test('should return default config when file does not exist', async () => {
      const config = await configService.loadConfig();

      assert.strictEqual(config.memoTypes.length, 2);
      assert.strictEqual(config.memoTypes[0].id, 'daily');
      assert.strictEqual(config.memoTypes[1].id, 'meeting');
      assert.strictEqual(config.baseDir, '.');
    });

    test('should handle invalid JSON gracefully', async () => {
      const configPath = '.vsmemo/types.json';
      mockFileService.setFileContent(configPath, 'invalid json');

      const config = await configService.loadConfig();

      assert.strictEqual(config.memoTypes.length, 2);
      assert.strictEqual(config.baseDir, '.');
    });

    test('should handle missing memoTypes property', async () => {
      const configPath = '.vsmemo/types.json';
      mockFileService.setFileContent(configPath, JSON.stringify({ baseDir: 'notes' }));

      const config = await configService.loadConfig();

      // When memoTypes is missing, returns default config
      assert.strictEqual(config.memoTypes.length, 2);
      assert.strictEqual(config.baseDir, '.');
    });

    test('should handle empty memoTypes array', async () => {
      const configPath = '.vsmemo/types.json';
      mockFileService.setFileContent(configPath, JSON.stringify({ memoTypes: [], baseDir: 'notes' }));

      const config = await configService.loadConfig();

      // When memoTypes is empty, returns default config
      assert.strictEqual(config.memoTypes.length, 2);
      assert.strictEqual(config.baseDir, '.');
    });

    test('should handle invalid memo type objects', async () => {
      const configPath = '.vsmemo/types.json';
      mockFileService.setFileContent(configPath, JSON.stringify({
        memoTypes: [
          { id: 'valid', name: 'Valid', template: 'template' },
          { name: 'Missing ID', template: 'template' },
          { id: 'missing-name', template: 'template' },
          { id: 'missing-template', name: 'Missing Template' },
          null,
          'string'
        ],
        baseDir: 'memos'
      }));

      const config = await configService.loadConfig();

      // When any memo type is invalid, returns default config
      assert.strictEqual(config.memoTypes.length, 2);
      assert.strictEqual(config.memoTypes[0].id, 'daily');
      assert.strictEqual(config.baseDir, '.');
    });

    test.skip('should use valid config when properly formatted', async () => {
      const configPath = '.vsmemo/types.json';
      const validConfig: MemoConfig = {
        memoTypes: [
          { id: 'custom', name: 'Custom Note', template: 'Custom template' }
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
      const configPath = '.vsmemo/types.json';
      mockFileService.setFileContent(configPath, JSON.stringify({
        memoTypes: [
          { id: 'test', name: 'Test', template: 'template' }
        ]
      }));

      const config = await configService.loadConfig();

      assert.strictEqual(config.baseDir, '.');
    });

    test('should fix missing fileExtensions', async () => {
      const configPath = '.vsmemo/types.json';
      mockFileService.setFileContent(configPath, JSON.stringify({
        memoTypes: [
          { id: 'test', name: 'Test', template: 'template' }
        ],
        baseDir: '.'
      }));

      const config = await configService.loadConfig();

      assert.deepStrictEqual(config.fileExtensions, ['.md', '.markdown']);
      assert.strictEqual(config.defaultExtension, '.md');
    });

    test('should fix invalid fileExtensions', async () => {
      const configPath = '.vsmemo/types.json';
      mockFileService.setFileContent(configPath, JSON.stringify({
        memoTypes: [
          { id: 'test', name: 'Test', template: 'template' }
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