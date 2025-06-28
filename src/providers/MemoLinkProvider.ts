import * as vscode from 'vscode';
import * as path from 'path';
import { IConfigService } from '../services/interfaces/IConfigService';
import { IFileService } from '../services/interfaces/IFileService';

export class MemoLinkProvider implements vscode.DefinitionProvider {
  constructor(
    private configService: IConfigService,
    private fileService: IFileService
  ) {}

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Definition | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // Get the word/line at the current position
    const wordRange = document.getWordRangeAtPosition(position, /\[.*?\]\(vsmemo:\/\/.*?\)/);
    if (!wordRange) {
      return undefined;
    }

    const linkText = document.getText(wordRange);
    const memoUri = this.extractMemoUri(linkText);
    if (!memoUri) {
      return undefined;
    }

    try {
      const config = await this.configService.loadConfig();
      const targetPath = await this.resolveMemoPath(memoUri, workspaceRoot, config.baseDir);

      if (targetPath && await this.fileService.exists(targetPath)) {
        return new vscode.Location(
          vscode.Uri.file(targetPath),
          new vscode.Position(0, 0)
        );
      }
    } catch (error) {
      console.warn('Error resolving memo link:', error);
    }

    return undefined;
  }

  /**
   * Extract memo URI from markdown link
   * Input: [メモのリンク](vsmemo://memo/2025/テストメモタイトル.markdown)
   * Output: memo/2025/テストメモタイトル.markdown
   */
  private extractMemoUri(linkText: string): string | undefined {
    const match = linkText.match(/\[.*?\]\(vsmemo:\/\/(.*?)\)/);
    return match ? match[1] : undefined;
  }

  /**
   * Resolve memo URI to absolute file path
   */
  private async resolveMemoPath(memoUri: string, workspaceRoot: string, baseDir: string): Promise<string | undefined> {
    try {
      // Decode each path component individually to preserve forward slashes
      const pathParts = memoUri.split('/');
      const decodedParts = pathParts.map(part => decodeURIComponent(part));
      const decodedUri = decodedParts.join('/');

      // Construct the full path: workspaceRoot/baseDir/memoUri
      const fullPath = path.join(workspaceRoot, baseDir, decodedUri);

      return fullPath;
    } catch (error) {
      console.warn('Error resolving memo path:', error);
      return undefined;
    }
  }
}

/**
 * Hover provider to show memo link information
 */
export class MemoLinkHoverProvider implements vscode.HoverProvider {
  constructor(
    private configService: IConfigService,
    private fileService: IFileService
  ) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // Get the word/line at the current position
    const wordRange = document.getWordRangeAtPosition(position, /\[.*?\]\(vsmemo:\/\/.*?\)/);
    if (!wordRange) {
      return undefined;
    }

    const linkText = document.getText(wordRange);
    const memoUri = this.extractMemoUri(linkText);
    if (!memoUri) {
      return undefined;
    }

    try {
      const config = await this.configService.loadConfig();
      const targetPath = await this.resolveMemoPath(memoUri, workspaceRoot, config.baseDir);

      if (targetPath) {
        const exists = await this.fileService.exists(targetPath);
        const relativePath = path.relative(workspaceRoot, targetPath);

        const hoverText = new vscode.MarkdownString();
        hoverText.appendMarkdown(`**VsMemo Link**\n\n`);
        hoverText.appendMarkdown(`📄 \`${relativePath}\`\n\n`);

        if (exists) {
          hoverText.appendMarkdown(`✅ File exists - Click to open`);
        } else {
          hoverText.appendMarkdown(`❌ File not found`);
        }

        return new vscode.Hover(hoverText, wordRange);
      }
    } catch (error) {
      console.warn('Error providing hover for memo link:', error);
    }

    return undefined;
  }

  private extractMemoUri(linkText: string): string | undefined {
    const match = linkText.match(/\[.*?\]\(vsmemo:\/\/(.*?)\)/);
    return match ? match[1] : undefined;
  }

  private async resolveMemoPath(memoUri: string, workspaceRoot: string, baseDir: string): Promise<string | undefined> {
    try {
      // Decode each path component individually to preserve forward slashes
      const pathParts = memoUri.split('/');
      const decodedParts = pathParts.map(part => decodeURIComponent(part));
      const decodedUri = decodedParts.join('/');

      const fullPath = path.join(workspaceRoot, baseDir, decodedUri);
      return fullPath;
    } catch (error) {
      console.warn('Error resolving memo path:', error);
      return undefined;
    }
  }
}