import { IVariable, VariableContext } from './IVariable';
import { UserDefinedVariable } from './UserDefinedVariable';
import {
  YearVariable,
  MonthVariable,
  DayVariable,
  DateVariable,
  TimeVariable,
  DateTimeVariable,
  TimestampVariable,
  TitleVariable
} from './systemVariables';
import { Variable } from '../models/Variable';

export class VariableRegistry {
  private variables = new Map<string, IVariable>();

  constructor() {
    this.registerSystemVariables();
  }

  private registerSystemVariables(): void {
    const systemVars: IVariable[] = [
      new YearVariable(),
      new MonthVariable(),
      new DayVariable(),
      new DateVariable(),
      new TimeVariable(),
      new DateTimeVariable(),
      new TimestampVariable(),
      new TitleVariable()
    ];

    systemVars.forEach(v => this.register(v));
  }

  register(variable: IVariable): void {
    this.variables.set(variable.name, variable);
  }

  registerUserDefinedVariables(variableDefinitions: Variable[]): void {
    variableDefinitions.forEach(varDef => {
      this.register(new UserDefinedVariable(
        varDef.name,
        varDef.description,
        varDef.default
      ));
    });
  }

  get(name: string): IVariable | undefined {
    return this.variables.get(name);
  }

  getAll(): IVariable[] {
    return Array.from(this.variables.values());
  }

  getAllVariableNames(): string[] {
    return Array.from(this.variables.keys());
  }

  getUserDefinedVariables(): IVariable[] {
    return this.getAll().filter(v => v instanceof UserDefinedVariable);
  }

  getSystemVariables(): IVariable[] {
    return this.getAll().filter(v => !(v instanceof UserDefinedVariable));
  }

  async resolveUsedVariables(usedVariableNames: Set<string>, context: VariableContext): Promise<Record<string, string>> {
    const resolvedVariables: Record<string, string> = {};

    for (const variableName of usedVariableNames) {
      const variable = this.get(variableName);
      if (variable) {
        const value = await variable.resolve(context);
        resolvedVariables[variableName] = value;
      }
    }

    return resolvedVariables;
  }
}