import * as assert from 'assert';
import { TemplateService } from '../../services/implementations/TemplateService';
import { IFileService, FileStats } from '../../services/interfaces/IFileService';
import { VariableRegistry } from '../../variables/VariableRegistry';
import { IWorkspaceService } from '../../usecases/CreateMemoUseCase';

class MockFileService implements IFileService {
  private files = new Map<string, string>();
  public openedFiles: string[] = [];

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

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async deleteFile(path: string): Promise<void> {
    this.files.delete(path);
  }

  async createDirectory(path: string): Promise<void> {
    // Mock implementation
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

  setFileContent(path: string, content: string): void {
    this.files.set(path, content);
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

class MockWorkspaceService implements IWorkspaceService {
  getWorkspaceRoot(): string | undefined {
    return '/test/workspace';
  }

  async showQuickPick<T extends any>(items: readonly T[], options?: any): Promise<T | undefined> {
    return undefined;
  }

  async showInputBox(options?: any): Promise<string | undefined> {
    return undefined;
  }

  showErrorMessage(message: string): void {
    // Mock implementation
  }
}

suite('TemplateService', () => {
  let templateService: TemplateService;
  let mockFileService: MockFileService;
  let mockWorkspaceService: MockWorkspaceService;

  setup(() => {
    mockFileService = new MockFileService();
    mockWorkspaceService = new MockWorkspaceService();
    templateService = new TemplateService(mockFileService, mockWorkspaceService);
  });

  suite('processTemplateFromFile', () => {
    test('should load template from file and process it', async () => {
      const templateContent = 'Title: {TITLE}\nDate: {DATE}';
      const templateFilePath = 'templates/simple.md';
      const configBasePath = '/workspace/.vsmemo';
      const fullTemplatePath = '/workspace/.vsmemo/templates/simple.md';

      mockFileService.setFileContent(fullTemplatePath, templateContent);

      const registry = new VariableRegistry();
      const presetInputs = {
        TITLE: 'Test Memo'
      };

      const result = await templateService.processTemplateFromFile(templateFilePath, configBasePath, registry, presetInputs);

      assert.strictEqual(result.content, 'Title: Test Memo\nDate: 2025-06-28');
      assert.strictEqual(result.frontmatter, undefined);
      assert.strictEqual(result.path, '');
    });

    test('should process template with frontmatter from file', async () => {
      const templateContent = `---
title: {TITLE}
date: {DATE}
path: notes/{YEAR}/{MONTH}/{DAY}.md
---

# {TITLE}

Content here`;
      const templateFilePath = 'templates/with-frontmatter.md';
      const configBasePath = '/workspace/.vsmemo';
      const fullTemplatePath = '/workspace/.vsmemo/templates/with-frontmatter.md';

      mockFileService.setFileContent(fullTemplatePath, templateContent);

      const registry = new VariableRegistry();
      const presetInputs = {
        TITLE: 'Test Memo'
      };

      const result = await templateService.processTemplateFromFile(templateFilePath, configBasePath, registry, presetInputs);

      assert.strictEqual(result.content, '# Test Memo\n\nContent here');
      assert.deepStrictEqual(result.frontmatter, {
        title: 'Test Memo',
        date: '2025-06-28'
      });
      assert.ok(!('path' in (result.frontmatter || {})), 'path property should be removed from frontmatter');
      assert.strictEqual(result.path, 'notes/2025/06/28.md');
    });

    test('should handle file not found error', async () => {
      const templateFilePath = 'templates/nonexistent.md';
      const configBasePath = '/workspace/.vsmemo';
      const registry = new VariableRegistry();
      const resolvedVariables = {
        YEAR: '2025',
        MONTH: '06',
        DAY: '27',
        DATE: '2025-06-27',
        TITLE: 'Test Memo'
      };

      await assert.rejects(
        async () => await templateService.processTemplateFromFile(templateFilePath, configBasePath, registry, resolvedVariables),
        /File not found/
      );
    });
  });

});