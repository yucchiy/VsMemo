import * as assert from 'assert';
import { UserDefinedVariable } from '../../variables/UserDefinedVariable';
import { VariableContext } from '../../variables/IVariable';

suite('UserDefinedVariable', () => {
  const context: VariableContext = {
    title: 'Test',
    date: new Date(),
    userInputs: {
      'PROJECT': 'MyProject',
      'AUTHOR': 'John Doe'
    }
  };

  test('should resolve to user input when available', async () => {
    const variable = new UserDefinedVariable('PROJECT', 'Project name');
    const result = await variable.resolve(context);
    assert.strictEqual(result, 'MyProject');
  });

  test('should resolve to default value when no user input', async () => {
    const variable = new UserDefinedVariable('VERSION', 'Version number', '1.0.0');
    const result = await variable.resolve(context);
    assert.strictEqual(result, '1.0.0');
  });

  test('should resolve to empty string when no input and no default', async () => {
    const variable = new UserDefinedVariable('UNDEFINED_VAR');
    const result = await variable.resolve(context);
    assert.strictEqual(result, '');
  });

  test('should have correct properties', () => {
    const variable = new UserDefinedVariable('TEST_VAR', 'Test description', 'default');
    assert.strictEqual(variable.name, 'TEST_VAR');
    assert.strictEqual(variable.description, 'Test description');
    assert.strictEqual(variable.defaultValue, 'default');
  });
});