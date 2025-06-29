import * as assert from 'assert';
import { VariableRegistry } from '../../variables/VariableRegistry';
import { UserDefinedVariable } from '../../variables/UserDefinedVariable';
import { Variable } from '../../models/Variable';
import { VariableContext } from '../../variables/IVariable';

suite('VariableRegistry', () => {
  let registry: VariableRegistry;

  setup(() => {
    registry = new VariableRegistry();
  });

  test('should initialize with system variables', () => {
    const systemVars = registry.getSystemVariables();
    assert.ok(systemVars.length > 0);

    const varNames = systemVars.map(v => v.name);
    assert.ok(varNames.includes('YEAR'));
    assert.ok(varNames.includes('MONTH'));
    assert.ok(varNames.includes('DAY'));
    assert.ok(varNames.includes('DATE'));
    assert.ok(varNames.includes('TIME'));
    assert.ok(varNames.includes('DATETIME'));
    assert.ok(varNames.includes('TIMESTAMP'));
    assert.ok(varNames.includes('TITLE'));
  });

  test('should register user-defined variables', () => {
    const userVarDefs: Variable[] = [
      { name: 'PROJECT', description: 'Project name', default: 'MyProject' },
      { name: 'AUTHOR', description: 'Author name' }
    ];

    registry.registerUserDefinedVariables(userVarDefs);

    const userVars = registry.getUserDefinedVariables();
    assert.strictEqual(userVars.length, 2);

    const project = registry.get('PROJECT');
    assert.ok(project);
    assert.strictEqual(project.name, 'PROJECT');
    assert.ok(project instanceof UserDefinedVariable);
  });

  test('should get variable by name', () => {
    const yearVar = registry.get('YEAR');
    assert.ok(yearVar);
    assert.strictEqual(yearVar.name, 'YEAR');
  });

  test('should return undefined for non-existent variable', () => {
    const nonExistent = registry.get('NON_EXISTENT');
    assert.strictEqual(nonExistent, undefined);
  });

  test('should get all variable names', () => {
    const names = registry.getAllVariableNames();
    assert.ok(Array.isArray(names));
    assert.ok(names.length > 0);
    assert.ok(names.includes('YEAR'));
    assert.ok(names.includes('TITLE'));
  });

  test('should register custom variable', () => {
    const customVar = new UserDefinedVariable('CUSTOM', 'Custom variable');
    registry.register(customVar);

    const retrieved = registry.get('CUSTOM');
    assert.strictEqual(retrieved, customVar);
  });

  test('should resolve only used variables', async () => {
    const userVarDefs: Variable[] = [
      { name: 'PROJECT', description: 'Project name', default: 'MyProject' },
      { name: 'AUTHOR', description: 'Author name', default: 'John' }
    ];

    registry.registerUserDefinedVariables(userVarDefs);

    const usedVariables = new Set(['YEAR', 'PROJECT']);
    const context: VariableContext = {
      date: new Date(2025, 5, 27),
      userInputs: {}
    };

    const resolved = await registry.resolveUsedVariables(usedVariables, context);

    assert.strictEqual(Object.keys(resolved).length, 2);
    assert.strictEqual(resolved['YEAR'], '2025');
    assert.strictEqual(resolved['PROJECT'], 'MyProject');
    assert.ok(!resolved.hasOwnProperty('AUTHOR')); // Should not be resolved
  });

  test('should resolve variables with user inputs', async () => {
    const userVarDefs: Variable[] = [
      { name: 'PROJECT', description: 'Project name', default: 'Default' }
    ];

    registry.registerUserDefinedVariables(userVarDefs);

    const usedVariables = new Set(['PROJECT', 'TITLE']);
    const context: VariableContext = {
      date: new Date(2025, 5, 27),
      userInputs: {
        'PROJECT': 'UserProject',
        'TITLE': 'UserTitle'
      }
    };

    const resolved = await registry.resolveUsedVariables(usedVariables, context);

    assert.strictEqual(resolved['PROJECT'], 'UserProject');
    assert.strictEqual(resolved['TITLE'], 'UserTitle');
  });
});