// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { createMemo } from './commands/createMemo';
import { listMemos } from './commands/listMemos';
import { commitChanges } from './commands/commitChanges';

export function activate(context: vscode.ExtensionContext) {
  console.log('VsMemo extension is now active!');

  const createMemoDisposable = vscode.commands.registerCommand('vsmemo.createMemo', createMemo);
  const listMemosDisposable = vscode.commands.registerCommand('vsmemo.listMemos', listMemos);
  const commitChangesDisposable = vscode.commands.registerCommand('vsmemo.commitChanges', commitChanges);

  context.subscriptions.push(createMemoDisposable, listMemosDisposable, commitChangesDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
