// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { createMemo } from './commands/createMemo';
import { listMemos } from './commands/listMemos';
import { commitChanges } from './commands/commitChanges';
import { createMemoFromType } from './commands/createMemoFromType';
import { insertMemoLink } from './commands/insertMemoLink';
import { openMemoFromPreview } from './commands/openMemoFromPreview';
import { MemoTreeDataProvider } from './views/MemoTreeDataProvider';
import { MemoLinkProvider, MemoLinkHoverProvider } from './providers/MemoLinkProvider';
import { MemoLinkCompletionProvider } from './providers/MemoLinkCompletionProvider';
import { MemoMarkdownPreviewProvider } from './providers/MemoMarkdownItPlugin';
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
  const memoLinkCompletionProvider = new MemoLinkCompletionProvider(configService, fileService);
  const memoMarkdownPreviewProvider = new MemoMarkdownPreviewProvider();

  // Register language features for markdown files (.md and .markdown)
  const markdownSelector: vscode.DocumentSelector = [
    { scheme: 'file', language: 'markdown' },
    { scheme: 'file', pattern: '**/*.md' },
    { scheme: 'file', pattern: '**/*.markdown' }
  ];
  const definitionProvider = vscode.languages.registerDefinitionProvider(markdownSelector, memoLinkProvider);
  const hoverProvider = vscode.languages.registerHoverProvider(markdownSelector, memoLinkHoverProvider);
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    markdownSelector,
    memoLinkCompletionProvider,
    '/', // Trigger on forward slash for path completion
    ':' // Trigger on colon for vsmemo:// completion
  );

  // Register commands
  const createMemoDisposable = vscode.commands.registerCommand('vsmemo.createMemo', createMemo);
  const listMemosDisposable = vscode.commands.registerCommand('vsmemo.listMemos', listMemos);
  const commitChangesDisposable = vscode.commands.registerCommand('vsmemo.commitChanges', commitChanges);
  const createMemoFromTypeDisposable = vscode.commands.registerCommand('vsmemo.createMemoFromType', createMemoFromType);
  const insertMemoLinkDisposable = vscode.commands.registerCommand('vsmemo.insertMemoLink', insertMemoLink);
  const openMemoFromPreviewDisposable = vscode.commands.registerCommand('vsmemo.openMemoFromPreview', openMemoFromPreview);
  const refreshDisposable = vscode.commands.registerCommand('vsmemo.refreshMemoExplorer', () => {
    memoTreeProvider.refresh();
  });

  context.subscriptions.push(
    createMemoDisposable,
    listMemosDisposable,
    commitChangesDisposable,
    createMemoFromTypeDisposable,
    insertMemoLinkDisposable,
    openMemoFromPreviewDisposable,
    refreshDisposable,
    treeView,
    definitionProvider,
    hoverProvider,
    completionProvider
  );

  // Return markdown extension API for preview support
  return {
    extendMarkdownIt(md: any) {
      return memoMarkdownPreviewProvider.extendMarkdownIt(md);
    }
  };
}

// This method is called when your extension is deactivated
export function deactivate() {}
