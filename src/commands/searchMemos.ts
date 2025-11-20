import * as vscode from 'vscode';
import * as path from 'path';
import { VsCodeConfigService } from '../services/implementations/VsCodeConfigService';
import { VsCodeFileService } from '../services/implementations/VsCodeFileService';
import { MetadataService } from '../services/implementations/MetadataService';
import { MemoSearchService } from '../services/implementations/MemoSearchService';
import { VsCodeWorkspaceService } from '../usecases/CreateMemoUseCase';

export async function searchMemos(): Promise<void> {
  try {
    const fileService = new VsCodeFileService();
    const configService = new VsCodeConfigService(fileService);
    const metadataService = new MetadataService();
    const workspaceService = new VsCodeWorkspaceService();

    const workspaceFolders = vscode.workspace.workspaceFolders;
    const workspaceRoot = workspaceFolders && workspaceFolders.length > 0
      ? workspaceFolders[0].uri.fsPath
      : '';

    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder found. Please open a workspace first.');
      return;
    }

    const searchService = new MemoSearchService(fileService, configService, metadataService, workspaceRoot);

    // 検索キーワードを入力
    const searchQuery = await vscode.window.showInputBox({
      prompt: 'Enter search keywords',
      placeHolder: 'Search in title and content...'
    });

    if (!searchQuery) {
      return;
    }

    // メモを検索
    const searchResults = await searchService.searchMemos(searchQuery);

    // 検索結果がない場合
    if (searchResults.length === 0) {
      vscode.window.showInformationMessage(`No memos found matching: "${searchQuery}"`);
      return;
    }

    // QuickPickアイテムを作成
    const items = searchResults.map(result => {
      const relativePath = path.relative(workspaceRoot, result.filePath);
      const tagsStr = result.tags && result.tags.length > 0 ? ` | Tags: ${result.tags.join(', ')}` : '';
      const excerptStr = result.excerpt ? `\n${result.excerpt}` : '';

      return {
        label: result.title,
        description: `[${result.memoType}] ${relativePath}`,
        detail: `Modified: ${result.lastModified.toLocaleString()}${tagsStr}${excerptStr}`,
        filePath: result.filePath
      };
    });

    // QuickPickで選択
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Found ${searchResults.length} memo${searchResults.length !== 1 ? 's' : ''} matching "${searchQuery}"`
    });

    // 選択されたメモを開く
    if (selected) {
      await fileService.openFile(selected.filePath);
    }
  } catch (error) {
    console.error('Error searching memos:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to search memos: ${message}`);
  }
}