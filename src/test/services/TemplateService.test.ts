import * as assert from 'assert';
import { TemplateService } from '../../services/implementations/TemplateService';
import { IFileService } from '../../services/interfaces/IFileService';

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

  async createDirectory(path: string): Promise<void> {
    // Mock implementation
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
}

suite('TemplateService', () => {
  let templateService: TemplateService;
  let mockFileService: MockFileService;

  setup(() => {
    mockFileService = new MockFileService();
    templateService = new TemplateService(mockFileService);
  });

  suite('createTemplateVariables', () => {
    test('should create template variables with current date', () => {
      const variables = templateService.createTemplateVariables();

      assert.ok(variables.YEAR);
      assert.ok(variables.MONTH);
      assert.ok(variables.DAY);
      assert.ok(variables.DATE);
      assert.ok(variables.TITLE);
      assert.strictEqual(variables.YEAR.length, 4);
      assert.strictEqual(variables.MONTH.length, 2);
      assert.strictEqual(variables.DAY.length, 2);
    });

    test('should use provided title', () => {
      const variables = templateService.createTemplateVariables('My Custom Title');
      assert.strictEqual(variables.TITLE, 'My Custom Title');
    });
  });

  suite('processTemplateFromFile', () => {
    test('should load template from file and process it', async () => {
      const templateContent = 'Title: {TITLE}\nDate: {DATE}';
      const templateFilePath = 'templates/simple.md';
      const configBasePath = '/workspace/.vsmemo';
      const fullTemplatePath = '/workspace/.vsmemo/templates/simple.md';

      mockFileService.setFileContent(fullTemplatePath, templateContent);

      const variables = {
        YEAR: '2025',
        MONTH: '06',
        DAY: '27',
        DATE: '2025-06-27',
        TITLE: 'Test Memo'
      };

      const result = await templateService.processTemplateFromFile(templateFilePath, configBasePath, variables);

      assert.strictEqual(result.content, 'Title: Test Memo\nDate: 2025-06-27');
      assert.strictEqual(result.frontmatter, undefined);
      assert.strictEqual(result.filePath, '');
    });

    test('should process template with frontmatter from file', async () => {
      const templateContent = `---
title: {TITLE}
date: {DATE}
filePath: notes/{YEAR}/{MONTH}/{DAY}.md
---

# {TITLE}

Content here`;
      const templateFilePath = 'templates/with-frontmatter.md';
      const configBasePath = '/workspace/.vsmemo';
      const fullTemplatePath = '/workspace/.vsmemo/templates/with-frontmatter.md';

      mockFileService.setFileContent(fullTemplatePath, templateContent);

      const variables = {
        YEAR: '2025',
        MONTH: '06',
        DAY: '27',
        DATE: '2025-06-27',
        TITLE: 'Test Memo'
      };

      const result = await templateService.processTemplateFromFile(templateFilePath, configBasePath, variables);

      assert.strictEqual(result.content, '# Test Memo\n\nContent here');
      assert.deepStrictEqual(result.frontmatter, {
        title: 'Test Memo',
        date: '2025-06-27'
      });
      assert.strictEqual(result.filePath, 'notes/2025/06/27.md');
    });

    test('should handle file not found error', async () => {
      const templateFilePath = 'templates/nonexistent.md';
      const configBasePath = '/workspace/.vsmemo';
      const variables = {
        YEAR: '2025',
        MONTH: '06',
        DAY: '27',
        DATE: '2025-06-27',
        TITLE: 'Test Memo'
      };

      await assert.rejects(
        async () => await templateService.processTemplateFromFile(templateFilePath, configBasePath, variables),
        /File not found/
      );
    });
  });

});