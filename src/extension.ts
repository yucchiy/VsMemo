// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { createMemo } from './commands/createMemo';
import { listMemos } from './commands/listMemos';
import { commitChanges } from './commands/commitChanges';
import { createMemoFromType } from './commands/createMemoFromType';
import { MemoTreeDataProvider } from './views/MemoTreeDataProvider';
import { VsCodeConfigService } from './services/implementations/VsCodeConfigService';
import { VsCodeFileService } from './services/implementations/VsCodeFileService';

export function activate(context: vscode.ExtensionContext) {
  console.log('VsMemo extension is now active!');

  // Initialize services
  const fileService = new VsCodeFileService();
  const configService = new VsCodeConfigService(fileService);

  // Create memo tree data provider
  const memoTreeProvider = new MemoTreeDataProvider(configService, fileService);

  // Register tree view
  const treeView = vscode.window.createTreeView('vsmemoExplorer', {
    treeDataProvider: memoTreeProvider,
    showCollapseAll: true
  });

  // Register commands
  const createMemoDisposable = vscode.commands.registerCommand('vsmemo.createMemo', createMemo);
  const listMemosDisposable = vscode.commands.registerCommand('vsmemo.listMemos', listMemos);
  const commitChangesDisposable = vscode.commands.registerCommand('vsmemo.commitChanges', commitChanges);
  const createMemoFromTypeDisposable = vscode.commands.registerCommand('vsmemo.createMemoFromType', createMemoFromType);
  const refreshDisposable = vscode.commands.registerCommand('vsmemo.refreshMemoExplorer', () => {
    memoTreeProvider.refresh();
  });

  context.subscriptions.push(
    createMemoDisposable,
    listMemosDisposable,
    commitChangesDisposable,
    createMemoFromTypeDisposable,
    refreshDisposable,
    treeView
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
