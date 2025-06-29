import * as assert from 'assert';
import {
  YearVariable,
  MonthVariable,
  DayVariable,
  DateVariable,
  TimeVariable,
  DateTimeVariable,
  TimestampVariable,
  TitleVariable
} from '../../variables/systemVariables';
import { VariableContext } from '../../variables/IVariable';

suite('System Variables', () => {
  const testDate = new Date(2025, 5, 27, 15, 30, 45, 123); // June 27, 2025 (month is 0-indexed)
  const context: VariableContext = {
    date: testDate,
    userInputs: {
      'TITLE': 'Test Memo'
    }
  };

  test('YearVariable should return 4-digit year', () => {
    const variable = new YearVariable();
    assert.strictEqual(variable.name, 'YEAR');
    assert.strictEqual(variable.resolve(context), '2025');
  });

  test('MonthVariable should return 2-digit month', () => {
    const variable = new MonthVariable();
    assert.strictEqual(variable.name, 'MONTH');
    assert.strictEqual(variable.resolve(context), '06');
  });

  test('DayVariable should return 2-digit day', () => {
    const variable = new DayVariable();
    assert.strictEqual(variable.name, 'DAY');
    assert.strictEqual(variable.resolve(context), '27');
  });

  test('DateVariable should return YYYY-MM-DD format', () => {
    const variable = new DateVariable();
    assert.strictEqual(variable.name, 'DATE');
    assert.strictEqual(variable.resolve(context), '2025-06-27');
  });

  test('TimeVariable should return HH:mm:ss format', () => {
    const variable = new TimeVariable();
    assert.strictEqual(variable.name, 'TIME');
    const time = variable.resolve(context);
    assert.ok(/^\d{2}:\d{2}:\d{2}$/.test(time));
  });

  test('DateTimeVariable should return YYYY-MM-DD HH:mm:ss format', () => {
    const variable = new DateTimeVariable();
    assert.strictEqual(variable.name, 'DATETIME');
    const datetime = variable.resolve(context);
    assert.ok(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(datetime));
  });

  test('TimestampVariable should return milliseconds', () => {
    const variable = new TimestampVariable();
    assert.strictEqual(variable.name, 'TIMESTAMP');
    assert.strictEqual(variable.resolve(context), testDate.getTime().toString());
  });

  test('TitleVariable should return title when provided', async () => {
    const variable = new TitleVariable();
    assert.strictEqual(variable.name, 'TITLE');
    assert.strictEqual(await variable.resolve(context), 'Test Memo');
  });

  test('TitleVariable should return default when title is not provided', async () => {
    const variable = new TitleVariable();
    const contextWithoutTitle: VariableContext = {
      date: testDate,
      userInputs: {}
    };
    assert.strictEqual(await variable.resolve(contextWithoutTitle), '2025-06-27');
  });

  test('TitleVariable should prompt for input when workspaceService is available', async () => {
    const variable = new TitleVariable();
    let promptShown = false;
    const contextWithWorkspace: VariableContext = {
      date: testDate,
      userInputs: {},
      workspaceService: {
        showInputBox: async (options: any) => {
          promptShown = true;
          assert.strictEqual(options.prompt, 'Enter memo title');
          return 'User Input Title';
        }
      }
    };
    assert.strictEqual(await variable.resolve(contextWithWorkspace), 'User Input Title');
    assert.ok(promptShown);
  });
});