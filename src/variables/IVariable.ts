export interface VariableContext {
  date: Date;
  userInputs?: Record<string, string>;
  workspaceService?: {
    showInputBox(options?: any): Promise<string | undefined>;
  };
}

export interface IVariable {
  readonly name: string;
  readonly description?: string;
  resolve(context: VariableContext): string | Promise<string>;
}