import * as assert from 'assert';
import { ListMemosUseCase } from '../../usecases/ListMemosUseCase';
import { IConfigService } from '../../services/interfaces/IConfigService';
import { IFileService, FileStats } from '../../services/interfaces/IFileService';
import { IWorkspaceService } from '../../usecases/CreateMemoUseCase';
import { MemoConfig } from '../../models/MemoConfig';

class MockConfigService implements IConfigService {
  constructor(private config: MemoConfig) {}

  async loadConfig(): Promise<MemoConfig> {
    return this.config;
  }
}

class MockFileService implements IFileService {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();
  private fileStats: Map<string, FileStats> = new Map();
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

  async readDirectory(path: string): Promise<string[]> {
    const entries: string[] = [];
    const pathPrefix = path.endsWith('/') ? path : path + '/';

    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(pathPrefix)) {
        const relativePath = filePath.substring(pathPrefix.length);
        if (!relativePath.includes('/')) {
          entries.push(relativePath);
        }
      }
    }

    for (const dirPath of this.directories) {
      if (dirPath.startsWith(pathPrefix)) {
        const relativePath = dirPath.substring(pathPrefix.length);
        if (!relativePath.includes('/')) {
          entries.push(relativePath);
        }
      }
    }

    return entries;
  }

  async getStats(path: string): Promise<FileStats> {
    const stats = this.fileStats.get(path);
    if (stats) {
      return stats;
    }

    return {
      lastModified: new Date('2025-06-27T10:00:00Z'),
      isDirectory: this.directories.has(path)
    };
  }

  setFileContent(path: string, content: string): void {
    this.files.set(path, content);
  }

  setDirectory(path: string): void {
    this.directories.add(path);
  }

  setFileStats(path: string, stats: FileStats): void {
    this.fileStats.set(path, stats);
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

suite('ListMemosUseCase', () => {
  let mockConfigService: MockConfigService;
  let mockFileService: MockFileService;
  let mockWorkspaceService: MockWorkspaceService;
  let useCase: ListMemosUseCase;

  const testConfig: MemoConfig = {
    memoTypes: [
      { id: 'daily', name: 'Daily Note', template: 'daily.md' },
      { id: 'meeting', name: 'Meeting Note', template: 'meeting.md' }
    ],
    baseDir: 'memos',
    fileExtensions: ['.md', '.markdown'],
    defaultExtension: '.md'
  };

  setup(() => {
    mockConfigService = new MockConfigService(testConfig);
    mockFileService = new MockFileService();
    mockWorkspaceService = new MockWorkspaceService();
    useCase = new ListMemosUseCase(mockConfigService, mockFileService, mockWorkspaceService);
  });

  test('should show error when no workspace is open', async () => {
    mockWorkspaceService.setWorkspaceRoot(undefined);

    await useCase.execute();

    assert.strictEqual(mockWorkspaceService.errorMessages.length, 1);
    assert.ok(mockWorkspaceService.errorMessages[0].includes('No workspace folder found'));
  });

  test('should show error when no memo types configured', async () => {
    const emptyConfig: MemoConfig = {
      memoTypes: [],
      baseDir: 'memos',
      fileExtensions: ['.md', '.markdown'],
      defaultExtension: '.md'
    };
    mockConfigService = new MockConfigService(emptyConfig);
    useCase = new ListMemosUseCase(mockConfigService, mockFileService, mockWorkspaceService);

    await useCase.execute();

    assert.strictEqual(mockWorkspaceService.errorMessages.length, 1);
    assert.ok(mockWorkspaceService.errorMessages[0].includes('No memo types configured'));
  });

  test('should list and open selected memo', async () => {
    const memoPath = '/test/workspace/memos/test-memo.md';
    const memoContent = `---
type: daily
title: Test Memo
---

# Test Memo

This is a test memo.`;

    mockFileService.setDirectory('/test/workspace/memos');
    mockFileService.setFileContent(memoPath, memoContent);
    mockFileService.setFileStats(memoPath, {
      lastModified: new Date('2025-06-27T12:00:00Z'),
      isDirectory: false
    });

    let callCount = 0;
    const originalShowQuickPick = mockWorkspaceService.showQuickPick;
    mockWorkspaceService.showQuickPick = async function<T>(items: readonly T[], options?: any): Promise<T | undefined> {
      callCount++;
      if (callCount === 1) {
        return { memoType: testConfig.memoTypes[0] } as T;
      } else if (callCount === 2) {
        return {
          memo: {
            title: 'Test Memo',
            filePath: memoPath,
            relativePath: 'memos/test-memo.md',
            lastModified: new Date('2025-06-27T12:00:00Z')
          }
        } as T;
      }
      return undefined;
    };

    await useCase.execute();

    assert.ok(mockFileService.openedFiles.includes(memoPath));
  });

  test('should show error when no memos found', async () => {
    mockFileService.setDirectory('/test/workspace/memos');
    mockWorkspaceService.setQuickPickResult({ memoType: testConfig.memoTypes[0] });

    await useCase.execute();

    assert.strictEqual(mockWorkspaceService.errorMessages.length, 1);
    assert.ok(mockWorkspaceService.errorMessages[0].includes('No memos found'));
  });

  test('should extract title from frontmatter', async () => {
    const memoPath = '/test/workspace/memos/frontmatter-memo.md';
    const memoContent = `---
type: daily
title: Frontmatter Title
date: 2025-06-27
---

# Content Title

Body content.`;

    mockFileService.setDirectory('/test/workspace/memos');
    mockFileService.setFileContent(memoPath, memoContent);
    mockFileService.setFileStats(memoPath, {
      lastModified: new Date('2025-06-27T12:00:00Z'),
      isDirectory: false
    });

    mockWorkspaceService.setQuickPickResult({ memoType: testConfig.memoTypes[0] });

    await useCase.execute();
  });

  test('should extract title from first heading when no frontmatter', async () => {
    const memoPath = '/test/workspace/memos/heading-memo.md';
    const memoContent = `---
type: daily
---

# Heading Title

This memo has frontmatter but no title property.`;

    mockFileService.setDirectory('/test/workspace/memos');
    mockFileService.setFileContent(memoPath, memoContent);
    mockFileService.setFileStats(memoPath, {
      lastModified: new Date('2025-06-27T12:00:00Z'),
      isDirectory: false
    });

    mockWorkspaceService.setQuickPickResult({ memoType: testConfig.memoTypes[0] });

    await useCase.execute();
  });

  test('should filter memos by type', async () => {
    const dailyMemoPath = '/test/workspace/memos/daily-memo.md';
    const dailyMemoContent = `---
type: daily
title: Daily Memo
---

# Daily Memo`;

    const meetingMemoPath = '/test/workspace/memos/meeting-memo.md';
    const meetingMemoContent = `---
type: meeting
title: Meeting Memo
---

# Meeting Memo`;

    mockFileService.setDirectory('/test/workspace/memos');
    mockFileService.setFileContent(dailyMemoPath, dailyMemoContent);
    mockFileService.setFileContent(meetingMemoPath, meetingMemoContent);
    mockFileService.setFileStats(dailyMemoPath, {
      lastModified: new Date('2025-06-27T12:00:00Z'),
      isDirectory: false
    });
    mockFileService.setFileStats(meetingMemoPath, {
      lastModified: new Date('2025-06-27T12:00:00Z'),
      isDirectory: false
    });

    let callCount = 0;
    mockWorkspaceService.showQuickPick = async function<T>(items: readonly T[], options?: any): Promise<T | undefined> {
      callCount++;
      if (callCount === 1) {
        // Select daily memo type
        return { memoType: testConfig.memoTypes[0] } as T;
      } else if (callCount === 2) {
        // Should only show daily memo, not meeting memo
        const memoItems = items as any[];
        assert.strictEqual(memoItems.length, 1);
        assert.strictEqual(memoItems[0].label, 'Daily Memo');
        return memoItems[0] as T;
      }
      return undefined;
    };

    await useCase.execute();

    assert.ok(mockFileService.openedFiles.includes(dailyMemoPath));
  });

  test('should show no memos when type does not match', async () => {
    const meetingMemoPath = '/test/workspace/memos/meeting-memo.md';
    const meetingMemoContent = `---
type: meeting
title: Meeting Memo
---

# Meeting Memo`;

    mockFileService.setDirectory('/test/workspace/memos');
    mockFileService.setFileContent(meetingMemoPath, meetingMemoContent);
    mockFileService.setFileStats(meetingMemoPath, {
      lastModified: new Date('2025-06-27T12:00:00Z'),
      isDirectory: false
    });

    // Select daily memo type, but only meeting memo exists
    mockWorkspaceService.setQuickPickResult({ memoType: testConfig.memoTypes[0] });

    await useCase.execute();

    assert.strictEqual(mockWorkspaceService.errorMessages.length, 1);
    assert.ok(mockWorkspaceService.errorMessages[0].includes('No memos found'));
  });

  test('should handle .markdown extension files', async () => {
    const markdownMemoPath = '/test/workspace/memos/markdown-memo.markdown';
    const markdownMemoContent = `---
type: daily
title: Markdown Memo
---

# Markdown Memo

Content in markdown file.`;

    mockFileService.setDirectory('/test/workspace/memos');
    mockFileService.setFileContent(markdownMemoPath, markdownMemoContent);
    mockFileService.setFileStats(markdownMemoPath, {
      lastModified: new Date('2025-06-28T12:00:00Z'),
      isDirectory: false
    });

    let callCount = 0;
    mockWorkspaceService.showQuickPick = async function<T>(items: readonly T[], options?: any): Promise<T | undefined> {
      callCount++;
      if (callCount === 1) {
        return { memoType: testConfig.memoTypes[0] } as T;
      } else if (callCount === 2) {
        const memoItems = items as any[];
        assert.strictEqual(memoItems.length, 1);
        assert.strictEqual(memoItems[0].label, 'Markdown Memo');
        return memoItems[0] as T;
      }
      return undefined;
    };

    await useCase.execute();

    assert.ok(mockFileService.openedFiles.includes(markdownMemoPath));
  });

  test('should filter files by extension', async () => {
    const mdMemoPath = '/test/workspace/memos/test.md';
    const markdownMemoPath = '/test/workspace/memos/test.markdown';
    const txtMemoPath = '/test/workspace/memos/test.txt';

    const memoContent = `---
type: daily
title: Test Memo
---

# Test Memo`;

    mockFileService.setDirectory('/test/workspace/memos');
    mockFileService.setFileContent(mdMemoPath, memoContent);
    mockFileService.setFileContent(markdownMemoPath, memoContent);
    mockFileService.setFileContent(txtMemoPath, memoContent);
    mockFileService.setFileStats(mdMemoPath, {
      lastModified: new Date('2025-06-28T12:00:00Z'),
      isDirectory: false
    });
    mockFileService.setFileStats(markdownMemoPath, {
      lastModified: new Date('2025-06-28T12:00:00Z'),
      isDirectory: false
    });
    mockFileService.setFileStats(txtMemoPath, {
      lastModified: new Date('2025-06-28T12:00:00Z'),
      isDirectory: false
    });

    let callCount = 0;
    mockWorkspaceService.showQuickPick = async function<T>(items: readonly T[], options?: any): Promise<T | undefined> {
      callCount++;
      if (callCount === 1) {
        return { memoType: testConfig.memoTypes[0] } as T;
      } else if (callCount === 2) {
        const memoItems = items as any[];
        // Should only include .md and .markdown files, not .txt
        assert.strictEqual(memoItems.length, 2);
        return memoItems[0] as T;
      }
      return undefined;
    };

    await useCase.execute();
  });
});