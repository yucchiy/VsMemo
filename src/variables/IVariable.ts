export interface VariableContext {
  title?: string;
  date: Date;
  userInputs?: Record<string, string>;
}

export interface IVariable {
  readonly name: string;
  readonly description?: string;
  resolve(context: VariableContext): string | Promise<string>;
}