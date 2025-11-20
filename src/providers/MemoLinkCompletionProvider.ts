import * as vscode from 'vscode';
import * as path from 'path';
import { IConfigService } from '../services/interfaces/IConfigService';
import { IFileService } from '../services/interfaces/IFileService';
import { isValidMemoFile, extractFileNameWithoutExtension } from '../utils/fileUtils';
import { calculateRelativePath } from '../utils/pathUtils';

export class MemoLinkCompletionProvider implements vscode.CompletionItemProvider {
  constructor(
    private configService: IConfigService,
    private fileService: IFileService
  ) {}

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[]> {
    const lineText = document.lineAt(position.line).text;
    const textBeforeCursor = lineText.substring(0, position.character);

    // Check if we're inside a markdown link (triggered after `](`)
    const linkMatch = textBeforeCursor.match(/\[.*?\]\(([^)]*?)$/);
    if (!linkMatch) {
      return [];
    }

    const partialPath = linkMatch[1];
    const currentFilePath = document.uri.fsPath;

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return [];
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const config = await this.configService.loadConfig();
      const baseDir = path.join(workspaceRoot, config.baseDir);

      // Collect all memo files
      const memoFiles: Array<{ title: string; relativePath: string; fullPath: string }> = [];
      await this.collectMemoFiles(baseDir, workspaceRoot, config.baseDir, config.fileExtensions, memoFiles);

      // Convert to completion items
      const completionItems: vscode.CompletionItem[] = [];

      for (const memo of memoFiles) {
        // Calculate relative path from current file to memo
        const relativePathFromCurrent = calculateRelativePath(currentFilePath, memo.fullPath);

        // Check if this memo matches the partial path
        if (partialPath === '' || relativePathFromCurrent.toLowerCase().includes(partialPath.toLowerCase()) ||
            memo.title.toLowerCase().includes(partialPath.toLowerCase())) {

          const completionItem = new vscode.CompletionItem(memo.title, vscode.CompletionItemKind.File);

          completionItem.insertText = relativePathFromCurrent;
          completionItem.detail = relativePathFromCurrent;
          completionItem.documentation = new vscode.MarkdownString(`📄 ${memo.relativePath}\n\nClick to insert memo link`);

          // Set the range to replace the partial path
          const startPos = position.translate(0, -partialPath.length);
          completionItem.range = new vscode.Range(startPos, position);

          // Set completion item kind to indicate file type

          // Sort by relevance (exact title match first, then path match, then others)
          if (memo.title.toLowerCase() === partialPath.toLowerCase()) {
            completionItem.sortText = '0' + memo.title;
          } else if (memo.title.toLowerCase().startsWith(partialPath.toLowerCase())) {
            completionItem.sortText = '1' + memo.title;
          } else if (memo.relativePath.toLowerCase().includes(partialPath.toLowerCase())) {
            completionItem.sortText = '2' + memo.title;
          } else {
            completionItem.sortText = '3' + memo.title;
          }

          completionItems.push(completionItem);
        }
      }

      return completionItems;
    } catch (error) {
      console.warn('Error providing memo link completion:', error);
      return [];
    }
  }

  private async collectMemoFiles(
    searchDir: string,
    workspaceRoot: string,
    baseDir: string,
    fileExtensions: string[],
    memoFiles: Array<{ title: string; relativePath: string; fullPath: string }>
  ): Promise<void> {
    try {
      if (!(await this.fileService.exists(searchDir))) {
        return;
      }

      const entries = await this.fileService.readDirectory(searchDir);

      for (const entry of entries) {
        const fullPath = path.join(searchDir, entry);
        const stats = await this.fileService.getStats(fullPath);

        if (stats.isDirectory) {
          // Recursively search subdirectories
          await this.collectMemoFiles(fullPath, workspaceRoot, baseDir, fileExtensions, memoFiles);
        } else if (isValidMemoFile(entry, fileExtensions)) {
          try {
            const content = await this.fileService.readFile(fullPath);
            const title = this.extractTitleFromContent(content, entry, fileExtensions);
            const relativePath = path.relative(path.join(workspaceRoot, baseDir), fullPath);

            memoFiles.push({
              title,
              relativePath,
              fullPath
            });
          } catch (error) {
            console.warn(`Failed to read memo file ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to search directory ${searchDir}:`, error);
    }
  }

  private extractTitleFromContent(content: string, fileName: string, fileExtensions: string[]): string {
    // Try to get title from frontmatter first
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatterText = frontmatterMatch[1];
      const titleMatch = frontmatterText.match(/^title:\s*(.*)$/m);
      if (titleMatch) {
        return titleMatch[1].trim();
      }
    }

    // Try to extract from first heading
    const headingMatch = content.match(/^#{1,6}\s+(.+)$/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }

    // Fall back to filename without extension
    return extractFileNameWithoutExtension(fileName, fileExtensions);
  }
}