import { IVariable, VariableContext } from './IVariable';

export class UserDefinedVariable implements IVariable {
  constructor(
    public readonly name: string,
    public readonly description?: string,
    public readonly defaultValue?: string
  ) {}

  async resolve(context: VariableContext): Promise<string> {
    if (context.userInputs?.[this.name]) {
      return context.userInputs[this.name];
    }
    return this.defaultValue || '';
  }
}