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
    public readonly lastModified?: Date,
    public readonly isDirectory?: boolean,
    public readonly directoryPath?: string
  ) {
    super(label, collapsibleState);

    if (filePath && !isDirectory) {
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
      this.iconPath = new vscode.ThemeIcon('file');
    } else if (isDirectory) {
      // This is a directory node
      this.contextValue = 'memoDirectory';
      this.tooltip = `Directory: ${directoryPath || label}`;
      this.iconPath = new vscode.ThemeIcon('folder');
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
      } else if (element.memoType && !element.isDirectory) {
        // Show directory structure for this memo type
        return this.getDirectoryStructure(element.memoType);
      } else if (element.isDirectory && element.memoType && element.directoryPath) {
        // Show subdirectories and files for this directory
        return this.getDirectoryContents(element.memoType, element.directoryPath);
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

  private async getDirectoryStructure(memoType: MemoType): Promise<MemoTreeItem[]> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return [];
      }

      const config = await this.configService.loadConfig();
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const baseSearchPath = path.join(workspaceRoot, config.baseDir);
      const memoTypeBaseDir = memoType.baseDir || '.';
      const memoTypeBasePath = path.join(workspaceRoot, config.baseDir, memoTypeBaseDir);

      // Collect all memos for this type to build directory structure
      const memos: Array<{ filePath: string; title: string; lastModified: Date; relativePath: string }> = [];
      await this.collectMemosWithPaths(baseSearchPath, memos, memoType, config.fileExtensions, baseSearchPath, memoTypeBasePath);

      // Build directory structure from collected memo paths
      return this.buildDirectoryTree(memos, '', memoType);
    } catch (error) {
      console.error(`Error loading directory structure for type ${memoType.name}:`, error);
      return [];
    }
  }

  private async getDirectoryContents(memoType: MemoType, directoryPath: string): Promise<MemoTreeItem[]> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return [];
      }

      const config = await this.configService.loadConfig();
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const baseSearchPath = path.join(workspaceRoot, config.baseDir);
      const memoTypeBaseDir = memoType.baseDir || '.';
      const memoTypeBasePath = path.join(workspaceRoot, config.baseDir, memoTypeBaseDir);

      // Collect all memos for this type
      const memos: Array<{ filePath: string; title: string; lastModified: Date; relativePath: string }> = [];
      await this.collectMemosWithPaths(baseSearchPath, memos, memoType, config.fileExtensions, baseSearchPath, memoTypeBasePath);

      // Build directory tree for the specific directory
      return this.buildDirectoryTree(memos, directoryPath, memoType);
    } catch (error) {
      console.error(`Error loading directory contents for ${directoryPath}:`, error);
      return [];
    }
  }

  private async collectMemosWithPaths(
    dir: string,
    memos: Array<{ filePath: string; title: string; lastModified: Date; relativePath: string }>,
    targetMemoType: MemoType,
    fileExtensions: string[],
    basePath: string,
    memoTypeBasePath: string
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
          await this.collectMemosWithPaths(fullPath, memos, targetMemoType, fileExtensions, basePath, memoTypeBasePath);
        } else if (isValidMemoFile(entry, fileExtensions)) {
          try {
            const content = await this.fileService.readFile(fullPath);
            const frontmatter = this.extractFrontmatter(content);

            // Check if this memo matches the target type
            if (frontmatter.type === targetMemoType.id) {
              const title = this.extractTitle(content, frontmatter, entry, fileExtensions);
              // Calculate relative path from memoType base path, not just config base path
              const relativePath = path.relative(memoTypeBasePath, fullPath);
              memos.push({
                filePath: fullPath,
                title,
                lastModified: stats.lastModified,
                relativePath
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

  private buildDirectoryTree(
    memos: Array<{ filePath: string; title: string; lastModified: Date; relativePath: string }>,
    currentPath: string,
    memoType: MemoType
  ): MemoTreeItem[] {
    const items: MemoTreeItem[] = [];
    const directories = new Set<string>();
    const files: Array<{ filePath: string; title: string; lastModified: Date; relativePath: string }> = [];

    // Filter memos for current directory level
    for (const memo of memos) {
      const memoDir = path.dirname(memo.relativePath);
      const normalizedMemoDir = memoDir === '.' ? '' : memoDir;

      if (currentPath === '') {
        // Root level - show immediate children
        const pathParts = normalizedMemoDir.split(path.sep).filter(part => part !== '');
        if (pathParts.length === 0) {
          // File in root
          files.push(memo);
        } else {
          // Directory in root
          directories.add(pathParts[0]);
        }
      } else {
        // Subdirectory level
        if (normalizedMemoDir.startsWith(currentPath)) {
          const relativePath = path.relative(currentPath, normalizedMemoDir);
          const pathParts = relativePath.split(path.sep).filter(part => part !== '');

          if (pathParts.length === 0) {
            // File in current directory
            files.push(memo);
          } else {
            // Subdirectory
            directories.add(pathParts[0]);
          }
        }
      }
    }

    // Add directory items (sorted alphabetically)
    const sortedDirectories = Array.from(directories).sort();
    for (const dirName of sortedDirectories) {
      const dirPath = currentPath ? path.join(currentPath, dirName) : dirName;
      items.push(new MemoTreeItem(
        dirName,
        vscode.TreeItemCollapsibleState.Collapsed,
        memoType,
        undefined,
        undefined,
        true,
        dirPath
      ));
    }

    // Add file items (sorted by last modified date, newest first)
    files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    for (const file of files) {
      items.push(new MemoTreeItem(
        file.title,
        vscode.TreeItemCollapsibleState.None,
        undefined,
        file.filePath,
        file.lastModified,
        false
      ));
    }

    return items;
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