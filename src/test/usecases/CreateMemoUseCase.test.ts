import * as assert from 'assert';
import { CreateMemoUseCase, IWorkspaceService } from '../../usecases/CreateMemoUseCase';
import { IConfigService } from '../../services/interfaces/IConfigService';
import { IFileService } from '../../services/interfaces/IFileService';
import { ITemplateService } from '../../services/interfaces/ITemplateService';
import { MemoConfig } from '../../models/MemoConfig';
import { Template, TemplateVariables } from '../../models/Template';

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

  async createDirectory(path: string): Promise<void> {
    this.directories.add(path);
  }

  async openFile(path: string): Promise<void> {
    this.openedFiles.push(path);
  }

  getWrittenContent(path: string): string | undefined {
    return this.files.get(path);
  }
}

class MockTemplateService implements ITemplateService {
  processTemplate(templateContent: string, variables: TemplateVariables): Template {
    return {
      content: `Processed: ${templateContent}`,
      filePath: `memos/${variables.TITLE}.md`,
      frontmatter: { title: variables.TITLE }
    };
  }

  createTemplateVariables(title?: string): TemplateVariables {
    return {
      YEAR: '2025',
      MONTH: '06',
      DAY: '27',
      DATE: '2025-06-27',
      TITLE: title || '2025-06-27'
    };
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
        name: 'Daily Note',
        template: 'Daily template: {TITLE}'
      },
      {
        name: 'Meeting Note',
        template: 'Meeting template: {TITLE}'
      }
    ],
    defaultOutputDir: 'memos'
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
    assert.ok(writtenContent.includes('Processed: Daily template: {TITLE}'));
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

  test('should throw error when config has no memo types', async () => {
    const emptyConfig = {
      memoTypes: [],
      defaultOutputDir: 'memos'
    };
    mockConfigService = new MockConfigService(emptyConfig);
    useCase = new CreateMemoUseCase(mockConfigService, mockFileService, mockTemplateService, mockWorkspaceService);

    try {
      await useCase.execute('Daily Note', 'Test Title');
      assert.fail('Expected error was not thrown');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes('No memo types configured'));
    }
  });

  test('should throw error when config is null', async () => {
    mockConfigService = {
      loadConfig: async () => null as any
    } as any;
    useCase = new CreateMemoUseCase(mockConfigService, mockFileService, mockTemplateService, mockWorkspaceService);

    try {
      await useCase.execute('Daily Note', 'Test Title');
      assert.fail('Expected error was not thrown');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes('No memo types configured'));
    }
  });
});