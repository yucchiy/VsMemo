// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { createMemo } from './commands/createMemo';
import { listMemos } from './commands/listMemos';
import { commitChanges } from './commands/commitChanges';
import { createMemoFromType } from './commands/createMemoFromType';
import { gitPull } from './commands/gitPull';
import { gitSync } from './commands/gitSync';
import { insertMemoLink } from './commands/insertMemoLink';
import { openMemoFromPreview } from './commands/openMemoFromPreview';
import { renameMemo } from './commands/renameMemo';
import { deleteMemo } from './commands/deleteMemo';
import { showBacklinks } from './commands/showBacklinks';
import { refreshBacklinks } from './commands/refreshBacklinks';
import { showOrphanedMemos } from './commands/showOrphanedMemos';
import { showLinkStatistics } from './commands/showLinkStatistics';
import { showGraph } from './commands/showGraph';
import { searchByTag } from './commands/searchByTag';
import { searchMemos } from './commands/searchMemos';
import { createMemoTypeCommand } from './commands/createSpecificMemoType';
import { MemoTreeDataProvider } from './views/MemoTreeDataProvider';
import { MemoInsightsView } from './views/BacklinkView';
import { GraphView } from './views/GraphView';
import { MemoLinkProvider, MemoLinkHoverProvider } from './providers/MemoLinkProvider';
import { MemoLinkCompletionProvider } from './providers/MemoLinkCompletionProvider';
import { MemoMarkdownPreviewProvider } from './providers/MemoMarkdownItPlugin';
import { VsCodeConfigService } from './services/implementations/VsCodeConfigService';
import { VsCodeFileService } from './services/implementations/VsCodeFileService';
import { BacklinkService } from './services/implementations/BacklinkService';
import { MetadataService } from './services/implementations/MetadataService';
import { TagIndexService } from './services/implementations/TagIndexService';
import { LoggerService } from './services/implementations/LoggerService';
import { LogLevel } from './services/interfaces/ILoggerService';
import { GitServiceManager } from './services/GitServiceManager';

export function activate(context: vscode.ExtensionContext) {
  // Initialize logging service
  const logger = new LoggerService(LogLevel.INFO);
  logger.info('VsMemo extension is now active!');

  // Initialize services
  const fileService = new VsCodeFileService();
  const configService = new VsCodeConfigService(fileService);
  const metadataService = new MetadataService();
  const gitManager = new GitServiceManager();

  // Get workspace root
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspaceRoot = workspaceFolders && workspaceFolders.length > 0
    ? workspaceFolders[0].uri.fsPath
    : '';

  // Create backlink service
  const backlinkService = new BacklinkService(fileService, configService, workspaceRoot, logger);

  // Create tag index service
  const tagIndexService = new TagIndexService(fileService, configService, metadataService, workspaceRoot);

  // Create memo tree data provider
  const memoTreeProvider = new MemoTreeDataProvider(configService, fileService, metadataService);

  // Register tree view
  const treeView = vscode.window.createTreeView('vsmemoExplorer', {
    treeDataProvider: memoTreeProvider,
    showCollapseAll: true
  });

  // Create memo insights view
  const memoInsightsView = new MemoInsightsView(backlinkService, fileService, metadataService);
  const memoInsightsTreeView = vscode.window.createTreeView('memoInsightsView', {
    treeDataProvider: memoInsightsView,
    showCollapseAll: true
  });

  // Initialize backlink index
  backlinkService.buildIndex().catch(console.error);

  // Initialize tag index
  tagIndexService.buildIndex().catch(console.error);

  // Register dynamic commands for memo types
  async function registerMemoTypeCommands() {
    try {
      const config = await configService.loadConfig();
      const memoTypeDisposables: vscode.Disposable[] = [];

      for (const memoType of config.memoTypes) {
        const commandId = `vsmemo.create${memoType.id.charAt(0).toUpperCase() + memoType.id.slice(1)}`;
        const disposable = vscode.commands.registerCommand(
          commandId,
          createMemoTypeCommand(memoType.name)
        );
        memoTypeDisposables.push(disposable);
        logger.info(`Registered command: ${commandId} for memo type: ${memoType.name}`);
      }

      context.subscriptions.push(...memoTypeDisposables);
    } catch (error) {
      logger.error('Failed to register memo type commands:', error as Error);
    }
  }

  // Register memo type commands
  registerMemoTypeCommands();

  // Update tag index when files are saved
  vscode.workspace.onDidSaveTextDocument(async (document) => {
    if (document.uri.scheme === 'file' && path.extname(document.uri.fsPath) === '.md') {
      await tagIndexService.updateFile(document.uri.fsPath);
    }
  });

  // Create graph view
  const graphView = new GraphView(backlinkService, fileService, configService, context);

  // Create memo link providers
  const memoLinkProvider = new MemoLinkProvider(configService, fileService);
  const memoLinkHoverProvider = new MemoLinkHoverProvider(configService, fileService, metadataService);
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
  const renameMemoDisposable = vscode.commands.registerCommand('vsmemo.renameMemo', renameMemo);
  const deleteMemoDisposable = vscode.commands.registerCommand('vsmemo.deleteMemo', deleteMemo);
  const refreshDisposable = vscode.commands.registerCommand('vsmemo.refreshMemoExplorer', () => {
    memoTreeProvider.refresh();
  });
  const showBacklinksDisposable = vscode.commands.registerCommand('vsmemo.showBacklinks', showBacklinks);
  const refreshBacklinksDisposable = vscode.commands.registerCommand('vsmemo.refreshBacklinks', () => refreshBacklinks(memoInsightsView));
  const showOrphanedMemosDisposable = vscode.commands.registerCommand('vsmemo.showOrphanedMemos', () => showOrphanedMemos(memoInsightsView));
  const showLinkStatisticsDisposable = vscode.commands.registerCommand('vsmemo.showLinkStatistics', () => showLinkStatistics(memoInsightsView));
  const showGraphDisposable = vscode.commands.registerCommand('vsmemo.showGraph', () => showGraph(graphView));
  const searchByTagDisposable = vscode.commands.registerCommand('vsmemo.searchByTag', (tag?: string) => searchByTag(tag));
  const searchMemosDisposable = vscode.commands.registerCommand('vsmemo.searchMemos', searchMemos);
  const gitPullDisposable = vscode.commands.registerCommand('vsmemo.git.pull', () => gitPull(gitManager));
  const gitSyncDisposable = vscode.commands.registerCommand('vsmemo.git.sync', () => gitSync(gitManager));

  context.subscriptions.push(
    createMemoDisposable,
    listMemosDisposable,
    commitChangesDisposable,
    createMemoFromTypeDisposable,
    insertMemoLinkDisposable,
    openMemoFromPreviewDisposable,
    renameMemoDisposable,
    deleteMemoDisposable,
    refreshDisposable,
    showBacklinksDisposable,
    refreshBacklinksDisposable,
    showOrphanedMemosDisposable,
    showLinkStatisticsDisposable,
    showGraphDisposable,
    searchByTagDisposable,
    searchMemosDisposable,
    gitPullDisposable,
    gitSyncDisposable,
    treeView,
    memoInsightsTreeView,
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
