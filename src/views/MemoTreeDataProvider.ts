import * as vscode from 'vscode';
import * as path from 'path';
import { IConfigService } from '../services/interfaces/IConfigService';
import { IFileService } from '../services/interfaces/IFileService';
import { MemoType } from '../models/MemoType';
import { isValidMemoFile, extractFileNameWithoutExtension } from '../utils/fileUtils';
import { MemoEvents } from '../events/MemoEvents';

export class MemoTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly memoType?: MemoType,
    public readonly filePath?: string,
    public readonly lastModified?: Date
  ) {
    super(label, collapsibleState);

    if (filePath) {
      // This is a memo file
      this.resourceUri = vscode.Uri.file(filePath);
      this.command = {
        command: 'vscode.open',
        title: 'Open Memo',
        arguments: [this.resourceUri]
      };
      this.contextValue = 'memoFile';
      this.tooltip = `${label}\nLast modified: ${lastModified?.toLocaleString() || 'Unknown'}`;
      this.description = lastModified?.toLocaleDateString();
    } else if (memoType) {
      // This is a memo type category
      this.contextValue = 'memoType';
      this.tooltip = `Memo type: ${memoType.name}`;
      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }
}

export class MemoTreeDataProvider implements vscode.TreeDataProvider<MemoTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<MemoTreeItem | undefined | null | void> = new vscode.EventEmitter<MemoTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<MemoTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(
    private configService: IConfigService,
    private fileService: IFileService
  ) {
    // Subscribe to memo events for auto-refresh
    const memoEvents = MemoEvents.getInstance();
    memoEvents.onMemoCreated(() => this.refresh());
    memoEvents.onMemoDeleted(() => this.refresh());
    memoEvents.onMemoModified(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: MemoTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MemoTreeItem): Promise<MemoTreeItem[]> {
    try {
      if (!element) {
        // Root level - show memo types
        return this.getMemoTypes();
      } else if (element.memoType) {
        // Show memos for this type
        return this.getMemosForType(element.memoType);
      }
      return [];
    } catch (error) {
      console.error('Error getting tree children:', error);
      return [];
    }
  }

  private async getMemoTypes(): Promise<MemoTreeItem[]> {
    try {
      const config = await this.configService.loadConfig();
      return config.memoTypes.map(memoType =>
        new MemoTreeItem(
          memoType.name,
          vscode.TreeItemCollapsibleState.Collapsed,
          memoType
        )
      );
    } catch (error) {
      console.error('Error loading memo types:', error);
      return [];
    }
  }

  private async getMemosForType(memoType: MemoType): Promise<MemoTreeItem[]> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return [];
      }

      const config = await this.configService.loadConfig();
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const searchPath = path.join(workspaceRoot, config.baseDir);

      const memos: Array<{ filePath: string; title: string; lastModified: Date }> = [];
      await this.searchMemosRecursively(searchPath, memos, memoType, config.fileExtensions);

      // Sort by last modified date (newest first)
      memos.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

      return memos.map(memo =>
        new MemoTreeItem(
          memo.title,
          vscode.TreeItemCollapsibleState.None,
          undefined,
          memo.filePath,
          memo.lastModified
        )
      );
    } catch (error) {
      console.error(`Error loading memos for type ${memoType.name}:`, error);
      return [];
    }
  }

  private async searchMemosRecursively(
    dir: string,
    memos: Array<{ filePath: string; title: string; lastModified: Date }>,
    targetMemoType: MemoType,
    fileExtensions: string[]
  ): Promise<void> {
    try {
      if (!(await this.fileService.exists(dir))) {
        return;
      }

      const entries = await this.fileService.readDirectory(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stats = await this.fileService.getStats(fullPath);

        if (stats.isDirectory) {
          // Recursively search subdirectories
          await this.searchMemosRecursively(fullPath, memos, targetMemoType, fileExtensions);
        } else if (isValidMemoFile(entry, fileExtensions)) {
          try {
            const content = await this.fileService.readFile(fullPath);
            const frontmatter = this.extractFrontmatter(content);

            // Check if this memo matches the target type
            if (frontmatter.type === targetMemoType.id) {
              const title = this.extractTitle(content, frontmatter, entry, fileExtensions);
              memos.push({
                filePath: fullPath,
                title,
                lastModified: stats.lastModified
              });
            }
          } catch (error) {
            console.warn(`Failed to read memo file ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to search directory ${dir}:`, error);
    }
  }

  private extractFrontmatter(content: string): Record<string, any> {
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return {};
    }

    const frontmatterText = frontmatterMatch[1];
    const frontmatter: Record<string, any> = {};

    for (const line of frontmatterText.split('\n')) {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        frontmatter[key] = value;
      }
    }

    return frontmatter;
  }

  private extractTitle(
    content: string,
    frontmatter: Record<string, any>,
    fileName: string,
    fileExtensions: string[]
  ): string {
    // Try to get title from frontmatter first
    if (frontmatter.title) {
      return frontmatter.title;
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