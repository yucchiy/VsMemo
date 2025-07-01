import * as assert from 'assert';
import { CreateMemoUseCase, IWorkspaceService } from '../../usecases/CreateMemoUseCase';
import { IConfigService } from '../../services/interfaces/IConfigService';
import { IFileService, FileStats } from '../../services/interfaces/IFileService';
import { ITemplateService } from '../../services/interfaces/ITemplateService';
import { MemoConfig } from '../../models/MemoConfig';
import { Template } from '../../models/Template';
import { VariableRegistry } from '../../variables/VariableRegistry';

class MockConfigService implements IConfigService {
  constructor(private config: MemoConfig) {}

  async loadConfig(): Promise<MemoConfig> {
    return this.config;
  }
}

class MockFileService implements IFileService {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();
  public openedFiles: string[] = [];

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.directories.has(path);
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
    this.directories.add(path);
  }

  async openTextDocument(path: string): Promise<void> {
    this.openedFiles.push(path);
  }

  async showTextDocument(path: string): Promise<void> {
    this.openedFiles.push(path);
  }

  async listFiles(dirPath: string, extensions: string[]): Promise<string[]> {
    return [];
  }

  async openFile(path: string): Promise<void> {
    this.openedFiles.push(path);
  }

  getWrittenContent(path: string): string | undefined {
    return this.files.get(path);
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
}

class MockTemplateService implements ITemplateService {
  private customPath?: string;
  private customBaseDir?: string;

  async processTemplateFromFile(templateFilePath: string, configBasePath: string, registry: VariableRegistry, presetInputs?: Record<string, string>): Promise<Template> {
    // Mock: simulate that TITLE variable is resolved internally
    const title = presetInputs?.['TITLE'] || 'Default Title';
    return {
      content: `Processed: ${templateFilePath}`,
      path: this.customPath || `${title}.md`,
      frontmatter: { title: title },
      baseDir: this.customBaseDir
    };
  }

  setCustomPath(path?: string): void {
    this.customPath = path;
  }

  setCustomBaseDir(baseDir?: string): void {
    this.customBaseDir = baseDir;
  }
}

class MockWorkspaceService implements IWorkspaceService {
  private workspaceRoot: string | undefined = '/test/workspace';
  private quickPickResult: any = undefined;
  private inputBoxResult: string | undefined = undefined;
  public errorMessages: string[] = [];

  getWorkspaceRoot(): string | undefined {
    return this.workspaceRoot;
  }

  async showQuickPick<T extends any>(items: readonly T[], options?: any): Promise<T | undefined> {
    return this.quickPickResult;
  }

  async showInputBox(options?: any): Promise<string | undefined> {
    return this.inputBoxResult;
  }

  showErrorMessage(message: string): void {
    this.errorMessages.push(message);
  }

  setWorkspaceRoot(root: string | undefined): void {
    this.workspaceRoot = root;
  }

  setQuickPickResult(result: any): void {
    this.quickPickResult = result;
  }

  setInputBoxResult(result: string | undefined): void {
    this.inputBoxResult = result;
  }
}

suite('CreateMemoUseCase', () => {
  let mockConfigService: MockConfigService;
  let mockFileService: MockFileService;
  let mockTemplateService: MockTemplateService;
  let mockWorkspaceService: MockWorkspaceService;
  let useCase: CreateMemoUseCase;

  const testConfig: MemoConfig = {
    memoTypes: [
      {
        id: 'daily',
        name: 'Daily Note',
        templatePath: 'Daily templatePath: {TITLE}'
      },
      {
        id: 'meeting',
        name: 'Meeting Note',
        templatePath: 'Meeting templatePath: {TITLE}'
      }
    ],
    baseDir: 'memos',
    fileExtensions: ['.md', '.markdown'],
    defaultExtension: '.md'
  };

  setup(() => {
    mockConfigService = new MockConfigService(testConfig);
    mockFileService = new MockFileService();
    mockTemplateService = new MockTemplateService();
    mockWorkspaceService = new MockWorkspaceService();
    useCase = new CreateMemoUseCase(mockConfigService, mockFileService, mockTemplateService, mockWorkspaceService);
  });

  test('should create memo with specified type and title', async () => {
    await useCase.execute('Daily Note', 'Test Title');

    const expectedPath = '/test/workspace/memos/Test Title.md';
    const writtenContent = mockFileService.getWrittenContent(expectedPath);

    assert.ok(writtenContent);
    assert.ok(writtenContent.includes('---'));
    assert.ok(writtenContent.includes('title: Test Title'));
    assert.ok(writtenContent.includes('type: daily'));
    assert.ok(writtenContent.includes('Processed: Daily templatePath: {TITLE}'));
    assert.ok(mockFileService.openedFiles.includes(expectedPath));
  });

  test('should handle existing file by opening without overwriting', async () => {
    const existingPath = '/test/workspace/memos/Existing Title.md';
    await mockFileService.writeFile(existingPath, 'Existing content');

    await useCase.execute('Daily Note', 'Existing Title');

    const content = mockFileService.getWrittenContent(existingPath);
    assert.strictEqual(content, 'Existing content');
    assert.ok(mockFileService.openedFiles.includes(existingPath));
  });

  test('should throw error for non-existent memo type', async () => {
    try {
      await useCase.execute('Non-existent Type', 'Test Title');
      assert.fail('Expected error was not thrown');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes('not found'));
    }
  });

  test('should respect baseDir when template has path', async () => {
    mockTemplateService.setCustomPath('daily/2025/06/28.md');

    await useCase.execute('Daily Note', 'Test Title');

    const expectedPath = '/test/workspace/memos/daily/2025/06/28.md';
    const writtenContent = mockFileService.getWrittenContent(expectedPath);

    assert.ok(writtenContent);
    assert.ok(writtenContent.includes('title: Test Title'));
    assert.ok(mockFileService.openedFiles.includes(expectedPath));
  });

  test('should use baseDir when template has no path', async () => {
    mockTemplateService.setCustomPath(undefined);

    await useCase.execute('Daily Note', 'Test Title');

    const expectedPath = '/test/workspace/memos/Test Title.md';
    const writtenContent = mockFileService.getWrittenContent(expectedPath);

    assert.ok(writtenContent);
    assert.ok(writtenContent.includes('title: Test Title'));
    assert.ok(mockFileService.openedFiles.includes(expectedPath));
  });

  test('should work with different baseDir settings', async () => {
    const customConfig: MemoConfig = {
      memoTypes: [
        {
          id: 'daily',
          name: 'Daily Note',
          templatePath: 'Daily templatePath: {TITLE}'
        }
      ],
      baseDir: 'notes',
      fileExtensions: ['.md'],
      defaultExtension: '.md'
    };

    mockConfigService = new MockConfigService(customConfig);
    useCase = new CreateMemoUseCase(mockConfigService, mockFileService, mockTemplateService, mockWorkspaceService);
    mockTemplateService.setCustomPath('daily/test.md');

    await useCase.execute('Daily Note', 'Test Title');

    const expectedPath = '/test/workspace/notes/daily/test.md';
    const writtenContent = mockFileService.getWrittenContent(expectedPath);

    assert.ok(writtenContent);
    assert.ok(writtenContent.includes('title: Test Title'));
    assert.ok(mockFileService.openedFiles.includes(expectedPath));
  });

  test('should use template baseDir in path generation', async () => {
    mockTemplateService.setCustomPath('project.md');
    mockTemplateService.setCustomBaseDir('projects/2025');

    await useCase.execute('Daily Note', 'Test Project');

    const expectedPath = '/test/workspace/memos/projects/2025/project.md';
    const writtenContent = mockFileService.getWrittenContent(expectedPath);

    assert.ok(writtenContent);
    assert.ok(writtenContent.includes('title: Test Project'));
    assert.ok(mockFileService.openedFiles.includes(expectedPath));
  });

  test('should handle template baseDir with no path', async () => {
    mockTemplateService.setCustomPath(undefined);
    mockTemplateService.setCustomBaseDir('archives');

    await useCase.execute('Daily Note', 'Archived Note');

    const expectedPath = '/test/workspace/memos/archives/Archived Note.md';
    const writtenContent = mockFileService.getWrittenContent(expectedPath);

    assert.ok(writtenContent);
    assert.ok(writtenContent.includes('title: Archived Note'));
    assert.ok(mockFileService.openedFiles.includes(expectedPath));
  });

  test('should use memoType baseDir in path generation', async () => {
    const customConfig: MemoConfig = {
      memoTypes: [
        {
          id: 'project',
          name: 'Project Note',
          templatePath: 'templates/project.md',
          baseDir: 'projects'
        }
      ],
      baseDir: 'memos',
      fileExtensions: ['.md'],
      defaultExtension: '.md'
    };

    mockConfigService = new MockConfigService(customConfig);
    useCase = new CreateMemoUseCase(mockConfigService, mockFileService, mockTemplateService, mockWorkspaceService);
    mockTemplateService.setCustomPath('project.md');

    await useCase.execute('Project Note', 'New Project');

    const expectedPath = '/test/workspace/memos/projects/project.md';
    const writtenContent = mockFileService.getWrittenContent(expectedPath);

    assert.ok(writtenContent);
    assert.ok(writtenContent.includes('title: New Project'));
    assert.ok(mockFileService.openedFiles.includes(expectedPath));
  });

  test('should combine memoType baseDir and template baseDir', async () => {
    const customConfig: MemoConfig = {
      memoTypes: [
        {
          id: 'daily',
          name: 'Daily Note',
          templatePath: 'templates/daily.md',
          baseDir: 'daily'
        }
      ],
      baseDir: 'memos',
      fileExtensions: ['.md'],
      defaultExtension: '.md'
    };

    mockConfigService = new MockConfigService(customConfig);
    useCase = new CreateMemoUseCase(mockConfigService, mockFileService, mockTemplateService, mockWorkspaceService);
    mockTemplateService.setCustomPath('note.md');
    mockTemplateService.setCustomBaseDir('2025/01');

    await useCase.execute('Daily Note', 'Test Note');

    const expectedPath = '/test/workspace/memos/daily/2025/01/note.md';
    const writtenContent = mockFileService.getWrittenContent(expectedPath);

    assert.ok(writtenContent);
    assert.ok(writtenContent.includes('title: Test Note'));
    assert.ok(mockFileService.openedFiles.includes(expectedPath));
  });

});