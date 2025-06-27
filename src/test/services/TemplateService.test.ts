import * as assert from 'assert';
import { TemplateService } from '../../services/implementations/TemplateService';

suite('TemplateService', () => {
  let templateService: TemplateService;

  setup(() => {
    templateService = new TemplateService();
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

  suite('processTemplate', () => {
    test('should replace variables in simple template', () => {
      const templateContent = 'Title: {TITLE}\nDate: {DATE}';
      const variables = {
        YEAR: '2025',
        MONTH: '06',
        DAY: '27',
        DATE: '2025-06-27',
        TITLE: 'Test Memo'
      };

      const result = templateService.processTemplate(templateContent, variables);

      assert.strictEqual(result.content, 'Title: Test Memo\nDate: 2025-06-27');
      assert.strictEqual(result.frontmatter, undefined);
      assert.strictEqual(result.filePath, '');
    });

    test('should process frontmatter and extract filePath', () => {
      const templateContent = `---
title: {TITLE}
date: {DATE}
filePath: notes/{YEAR}/{MONTH}/{DAY}.md
---

# {TITLE}

Content here`;

      const variables = {
        YEAR: '2025',
        MONTH: '06',
        DAY: '27',
        DATE: '2025-06-27',
        TITLE: 'Test Memo'
      };

      const result = templateService.processTemplate(templateContent, variables);

      assert.strictEqual(result.content, '# Test Memo\n\nContent here');
      assert.deepStrictEqual(result.frontmatter, {
        title: 'Test Memo',
        date: '2025-06-27'
      });
      assert.strictEqual(result.filePath, 'notes/2025/06/27.md');
    });

    test('should handle template without frontmatter', () => {
      const templateContent = '# {TITLE}\n\nThis is a simple memo for {DATE}';
      const variables = {
        YEAR: '2025',
        MONTH: '06',
        DAY: '27',
        DATE: '2025-06-27',
        TITLE: 'Simple Test'
      };

      const result = templateService.processTemplate(templateContent, variables);

      assert.strictEqual(result.content, '# Simple Test\n\nThis is a simple memo for 2025-06-27');
      assert.strictEqual(result.frontmatter, undefined);
      assert.strictEqual(result.filePath, '');
    });

    test('should handle frontmatter without filePath', () => {
      const templateContent = `---
title: {TITLE}
author: John Doe
---

Content: {TITLE}`;

      const variables = {
        YEAR: '2025',
        MONTH: '06',
        DAY: '27',
        DATE: '2025-06-27',
        TITLE: 'Test'
      };

      const result = templateService.processTemplate(templateContent, variables);

      assert.strictEqual(result.content, 'Content: Test');
      assert.deepStrictEqual(result.frontmatter, {
        title: 'Test',
        author: 'John Doe'
      });
      assert.strictEqual(result.filePath, '');
    });
  });
});