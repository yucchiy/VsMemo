import * as assert from 'assert';
import { UserDefinedVariable } from '../../variables/UserDefinedVariable';
import { VariableContext } from '../../variables/IVariable';

class MockWorkspaceService {
  private inputBoxResult: string | undefined = undefined;

  async showInputBox(options?: any): Promise<string | undefined> {
    return this.inputBoxResult;
  }

  setInputBoxResult(result: string | undefined): void {
    this.inputBoxResult = result;
  }
}

suite('UserDefinedVariable', () => {
  let mockWorkspaceService: MockWorkspaceService;

  setup(() => {
    mockWorkspaceService = new MockWorkspaceService();
  });

  test('should return user input when provided', async () => {
    const variable = new UserDefinedVariable('TEST', 'Test variable', 'default');
    const context: VariableContext = {
      date: new Date(),
      userInputs: { 'TEST': 'user-input' },
      workspaceService: mockWorkspaceService
    };

    const result = await variable.resolve(context);
    assert.strictEqual(result, 'user-input');
  });

  test('should prompt user and return input when no user input provided', async () => {
    const variable = new UserDefinedVariable('TEST', 'Test variable', 'default');
    mockWorkspaceService.setInputBoxResult('prompted-input');

    const context: VariableContext = {
      date: new Date(),
      userInputs: {},
      workspaceService: mockWorkspaceService
    };

    const result = await variable.resolve(context);
    assert.strictEqual(result, 'prompted-input');
  });

  test('should return default value when user enters empty input', async () => {
    const variable = new UserDefinedVariable('TEST', 'Test variable', 'default-value');
    mockWorkspaceService.setInputBoxResult('');

    const context: VariableContext = {
      date: new Date(),
      userInputs: {},
      workspaceService: mockWorkspaceService
    };

    const result = await variable.resolve(context);
    assert.strictEqual(result, 'default-value');
  });

  test('should return empty string when no default and user enters empty input', async () => {
    const variable = new UserDefinedVariable('TEST', 'Test variable');
    mockWorkspaceService.setInputBoxResult('');

    const context: VariableContext = {
      date: new Date(),
      userInputs: {},
      workspaceService: mockWorkspaceService
    };

    const result = await variable.resolve(context);
    assert.strictEqual(result, '');
  });

  test('should return default value when no workspace service available', async () => {
    const variable = new UserDefinedVariable('TEST', 'Test variable', 'default-value');

    const context: VariableContext = {
      date: new Date(),
      userInputs: {}
    };

    const result = await variable.resolve(context);
    assert.strictEqual(result, 'default-value');
  });

  test('should have correct properties', () => {
    const variable = new UserDefinedVariable('TEST_VAR', 'Test description', 'default');
    assert.strictEqual(variable.name, 'TEST_VAR');
    assert.strictEqual(variable.description, 'Test description');
    assert.strictEqual(variable.defaultValue, 'default');
  });
});