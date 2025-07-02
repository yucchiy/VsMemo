import * as vscode from 'vscode';
import * as path from 'path';
import { IConfigService } from '../services/interfaces/IConfigService';
import { IFileService } from '../services/interfaces/IFileService';
import { IMetadataService } from '../services/interfaces/IMetadataService';
import { MemoMetadata } from '../models/MemoMetadata';

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
    private fileService: IFileService,
    private metadataService?: IMetadataService
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
          hoverText.appendMarkdown(`✅ File exists - Click to open\n\n`);

          // Show metadata if available
          if (this.metadataService) {
            try {
              const content = await this.fileService.readFile(targetPath);
              const metadata = this.metadataService.extractMetadata(content);

              if (metadata) {
                // Show special metadata
                if (metadata.special.title) {
                  hoverText.appendMarkdown(`**📝 Title**: ${metadata.special.title}\n\n`);
                }
                if (metadata.special.tags && metadata.special.tags.length > 0) {
                  hoverText.appendMarkdown(`**🏷️ Tags**: ${metadata.special.tags.join(', ')}\n\n`);
                }

                // Show user metadata
                const userKeys = Object.keys(metadata.user);
                if (userKeys.length > 0) {
                  hoverText.appendMarkdown(`**📋 Properties**\n\n`);

                  // Show up to 5 user properties
                  const maxProperties = 5;
                  const displayKeys = userKeys.slice(0, maxProperties);

                  for (const key of displayKeys) {
                    const value = metadata.user[key];
                    const icon = this.getPropertyIcon(key);
                    hoverText.appendMarkdown(`${icon} **${this.formatPropertyName(key)}**: ${this.formatPropertyValue(value)}\n`);
                  }

                  if (userKeys.length > maxProperties) {
                    hoverText.appendMarkdown(`\n_...and ${userKeys.length - maxProperties} more properties_`);
                  }
                }
              }
            } catch (error) {
              // Silently fail - don't show metadata if we can't read it
              console.warn('Failed to read metadata for hover:', error);
            }
          }
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

  /**
   * Get icon for property based on name
   */
  private getPropertyIcon(key: string): string {
    const lowerKey = key.toLowerCase();

    // Common property icons
    if (lowerKey.includes('author')) {return '👤';}
    if (lowerKey.includes('status')) {return '📊';}
    if (lowerKey.includes('priority')) {return '⚡';}
    if (lowerKey.includes('project')) {return '🚀';}
    if (lowerKey.includes('date') || lowerKey.includes('time')) {return '📅';}
    if (lowerKey.includes('category')) {return '📁';}
    if (lowerKey.includes('company')) {return '🏢';}

    // Default icon
    return '•';
  }

  /**
   * Format property name for display
   */
  private formatPropertyName(key: string): string {
    // Convert camelCase or snake_case to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format property value for display
   */
  private formatPropertyValue(value: any): string {
    if (value === null || value === undefined) {
      return '_Not set_';
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }
}