import * as vscode from 'vscode';
import * as path from 'path';
import { IBacklinkService, Backlink } from '../services/interfaces/IBacklinkService';

export class BacklinkTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly backlink?: Backlink,
    public readonly filePath?: string,
    public readonly isFileGroup?: boolean
  ) {
    super(label, collapsibleState);

    if (backlink && filePath) {
      // This is a backlink item
      this.command = {
        command: 'vscode.open',
        title: 'Open',
        arguments: [vscode.Uri.file(backlink.sourceFile), { selection: new vscode.Range(backlink.sourceLine - 1, 0, backlink.sourceLine - 1, 0) }]
      };
      this.contextValue = 'backlink';
      this.tooltip = new vscode.MarkdownString();
      this.tooltip.appendCodeblock(backlink.context, 'markdown');
      this.description = `Line ${backlink.sourceLine}`;
      this.iconPath = new vscode.ThemeIcon('link');
    } else if (isFileGroup) {
      // This is a file group
      this.contextValue = 'backlinkFile';
      this.iconPath = new vscode.ThemeIcon('file-text');
      const backlinkCount = this.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed ?
        this.label.match(/\((\d+)\)$/)?.[1] || '0' : '0';
      this.description = `${backlinkCount} reference${parseInt(backlinkCount) !== 1 ? 's' : ''}`;
    }
  }
}

export class BacklinkView implements vscode.TreeDataProvider<BacklinkTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<BacklinkTreeItem | undefined | null | void> = new vscode.EventEmitter<BacklinkTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<BacklinkTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private currentFile: string | undefined;
  private backlinks: Map<string, Backlink[]> = new Map();
  private isLoading = false;

  constructor(
    private backlinkService: IBacklinkService
  ) {
    // Listen to active editor changes
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor?.document.uri.scheme === 'file') {
        await this.updateForFile(editor.document.uri.fsPath);
      }
    });

    // Update when files are saved (to catch new links)
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (document.uri.scheme === 'file') {
        await this.backlinkService.updateFileBacklinks(document.uri.fsPath);
        if (this.currentFile) {
          await this.updateForFile(this.currentFile);
        }
      }
    });

    // Initialize with current active editor
    if (vscode.window.activeTextEditor?.document.uri.scheme === 'file') {
      this.updateForFile(vscode.window.activeTextEditor.document.uri.fsPath);
    }
  }

  async refresh(): Promise<void> {
    this.isLoading = true;
    this._onDidChangeTreeData.fire();

    await this.backlinkService.buildIndex();

    if (this.currentFile) {
      await this.updateForFile(this.currentFile);
    }

    this.isLoading = false;
  }

  async updateForFile(filePath: string): Promise<void> {
    this.currentFile = filePath;
    const backlinks = await this.backlinkService.getBacklinks(filePath);

    // Group backlinks by source file
    this.backlinks.clear();
    backlinks.forEach(backlink => {
      const sourceFile = backlink.sourceFile;
      if (!this.backlinks.has(sourceFile)) {
        this.backlinks.set(sourceFile, []);
      }
      this.backlinks.get(sourceFile)!.push(backlink);
    });

    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: BacklinkTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: BacklinkTreeItem): Promise<BacklinkTreeItem[]> {
    if (this.isLoading) {
      return [new BacklinkTreeItem('Loading...', vscode.TreeItemCollapsibleState.None)];
    }

    if (!this.currentFile) {
      return [new BacklinkTreeItem('No file open', vscode.TreeItemCollapsibleState.None)];
    }

    if (!element) {
      // Root level - show files that contain backlinks
      if (this.backlinks.size === 0) {
        return [new BacklinkTreeItem('No backlinks found', vscode.TreeItemCollapsibleState.None)];
      }

      const items: BacklinkTreeItem[] = [];
      this.backlinks.forEach((backlinks, sourceFile) => {
        const fileName = path.basename(sourceFile);
        const label = `${fileName} (${backlinks.length})`;
        items.push(new BacklinkTreeItem(
          label,
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          sourceFile,
          true
        ));
      });

      // Sort by number of backlinks (descending)
      items.sort((a, b) => {
        const aCount = parseInt(a.label.match(/\((\d+)\)$/)?.[1] || '0');
        const bCount = parseInt(b.label.match(/\((\d+)\)$/)?.[1] || '0');
        return bCount - aCount;
      });

      return items;
    } else if (element.isFileGroup && element.filePath) {
      // Show individual backlinks for a file
      const backlinks = this.backlinks.get(element.filePath) || [];
      return backlinks.map(backlink => {
        const label = backlink.linkText || 'Untitled link';
        return new BacklinkTreeItem(
          label,
          vscode.TreeItemCollapsibleState.None,
          backlink,
          element.filePath
        );
      });
    }

    return [];
  }

  async showOrphanedFiles(): Promise<void> {
    const orphaned = await this.backlinkService.getOrphanedFiles();

    if (orphaned.length === 0) {
      vscode.window.showInformationMessage('No orphaned files found! All memos are connected.');
      return;
    }

    const items = orphaned.map(file => ({
      label: path.basename(file),
      description: path.relative(vscode.workspace.rootPath || '', file),
      filePath: file
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `${orphaned.length} orphaned files found. Select one to open.`,
      matchOnDescription: true
    });

    if (selected) {
      const doc = await vscode.workspace.openTextDocument(selected.filePath);
      await vscode.window.showTextDocument(doc);
    }
  }

  async showLinkStatistics(): Promise<void> {
    const stats = await this.backlinkService.getLinkStatistics();

    const message = `
**Link Statistics**

- Total Links: ${stats.totalLinks}
- Total Files: ${stats.totalFiles}
- Average Links per File: ${stats.averageLinksPerFile.toFixed(2)}

**Most Linked Files:**
${stats.mostLinkedFiles.map((item, index) =>
    `${index + 1}. ${path.basename(item.file)} (${item.count} links)`
  ).join('\n')}
    `;

    const panel = vscode.window.createWebviewPanel(
      'backlinkStats',
      'Link Statistics',
      vscode.ViewColumn.One,
      {}
    );

    panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: var(--vscode-font-family); 
            color: var(--vscode-foreground);
            padding: 20px;
          }
          h2 { color: var(--vscode-foreground); }
          ul { line-height: 1.6; }
          .stat { margin: 10px 0; }
        </style>
      </head>
      <body>
        <h2>Link Statistics</h2>
        <div class="stat"><strong>Total Links:</strong> ${stats.totalLinks}</div>
        <div class="stat"><strong>Total Files:</strong> ${stats.totalFiles}</div>
        <div class="stat"><strong>Average Links per File:</strong> ${stats.averageLinksPerFile.toFixed(2)}</div>
        
        <h3>Most Linked Files</h3>
        <ol>
          ${stats.mostLinkedFiles.map(item =>
    `<li>${path.basename(item.file)} - ${item.count} links</li>`
  ).join('')}
        </ol>
      </body>
      </html>
    `;
  }
}