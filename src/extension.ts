// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { createMemo } from './commands/createMemo';
import { listMemos } from './commands/listMemos';
import { commitChanges } from './commands/commitChanges';
import { createMemoFromType } from './commands/createMemoFromType';
import { insertMemoLink } from './commands/insertMemoLink';
import { MemoTreeDataProvider } from './views/MemoTreeDataProvider';
import { MemoLinkProvider, MemoLinkHoverProvider } from './providers/MemoLinkProvider';
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

  // Create memo link providers
  const memoLinkProvider = new MemoLinkProvider(configService, fileService);
  const memoLinkHoverProvider = new MemoLinkHoverProvider(configService, fileService);

  // Register language features for markdown files
  const markdownSelector: vscode.DocumentSelector = { scheme: 'file', language: 'markdown' };
  const definitionProvider = vscode.languages.registerDefinitionProvider(markdownSelector, memoLinkProvider);
  const hoverProvider = vscode.languages.registerHoverProvider(markdownSelector, memoLinkHoverProvider);

  // Register commands
  const createMemoDisposable = vscode.commands.registerCommand('vsmemo.createMemo', createMemo);
  const listMemosDisposable = vscode.commands.registerCommand('vsmemo.listMemos', listMemos);
  const commitChangesDisposable = vscode.commands.registerCommand('vsmemo.commitChanges', commitChanges);
  const createMemoFromTypeDisposable = vscode.commands.registerCommand('vsmemo.createMemoFromType', createMemoFromType);
  const insertMemoLinkDisposable = vscode.commands.registerCommand('vsmemo.insertMemoLink', insertMemoLink);
  const refreshDisposable = vscode.commands.registerCommand('vsmemo.refreshMemoExplorer', () => {
    memoTreeProvider.refresh();
  });

  context.subscriptions.push(
    createMemoDisposable,
    listMemosDisposable,
    commitChangesDisposable,
    createMemoFromTypeDisposable,
    insertMemoLinkDisposable,
    refreshDisposable,
    treeView,
    definitionProvider,
    hoverProvider
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
