import * as assert from 'assert';
import { extractVariableNames } from '../../utils/variableUtils';

suite('variableUtils', () => {
  suite('extractVariableNames', () => {
    test('should extract single variable', () => {
      const content = 'Hello {NAME}!';
      const variables = extractVariableNames(content);
      assert.strictEqual(variables.size, 1);
      assert.ok(variables.has('NAME'));
    });

    test('should extract multiple variables', () => {
      const content = 'Date: {YEAR}-{MONTH}-{DAY}';
      const variables = extractVariableNames(content);
      assert.strictEqual(variables.size, 3);
      assert.ok(variables.has('YEAR'));
      assert.ok(variables.has('MONTH'));
      assert.ok(variables.has('DAY'));
    });

    test('should extract unique variables only', () => {
      const content = '{TITLE} - {TITLE} - {DATE}';
      const variables = extractVariableNames(content);
      assert.strictEqual(variables.size, 2);
      assert.ok(variables.has('TITLE'));
      assert.ok(variables.has('DATE'));
    });

    test('should handle variables with underscores', () => {
      const content = '{USER_NAME} - {PROJECT_ID}';
      const variables = extractVariableNames(content);
      assert.strictEqual(variables.size, 2);
      assert.ok(variables.has('USER_NAME'));
      assert.ok(variables.has('PROJECT_ID'));
    });

    test('should ignore lowercase variables', () => {
      const content = '{lowercase} - {UPPERCASE}';
      const variables = extractVariableNames(content);
      assert.strictEqual(variables.size, 1);
      assert.ok(variables.has('UPPERCASE'));
      assert.ok(!variables.has('lowercase'));
    });

    test('should handle empty content', () => {
      const variables = extractVariableNames('');
      assert.strictEqual(variables.size, 0);
    });

    test('should handle content without variables', () => {
      const content = 'No variables here!';
      const variables = extractVariableNames(content);
      assert.strictEqual(variables.size, 0);
    });

    test('should extract variables from multiline content', () => {
      const content = `---
title: {TITLE}
date: {DATE}
---

# {TITLE}

Created on {DATE} by {AUTHOR}`;
      const variables = extractVariableNames(content);
      assert.strictEqual(variables.size, 3);
      assert.ok(variables.has('TITLE'));
      assert.ok(variables.has('DATE'));
      assert.ok(variables.has('AUTHOR'));
    });
  });
});