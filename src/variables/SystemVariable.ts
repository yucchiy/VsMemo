import { IVariable, VariableContext } from './IVariable';

export abstract class SystemVariable implements IVariable {
  constructor(
    public readonly name: string,
    public readonly description?: string
  ) {}

  abstract resolve(context: VariableContext): string;
}