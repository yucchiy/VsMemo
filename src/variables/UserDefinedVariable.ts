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

    if (context.workspaceService) {
      const input = await context.workspaceService.showInputBox({
        prompt: this.description ? `Enter ${this.description}` : `Enter value for ${this.name}`,
        placeHolder: this.defaultValue || ''
      });

      if (input !== undefined && input !== '') {
        return input;
      }
    }

    return this.defaultValue || '';
  }
}