import * as vscode from 'vscode';
import * as path from 'path';
import { IBacklinkService, Backlink, OutboundLink } from '../services/interfaces/IBacklinkService';

export class MemoInsightsTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly backlink?: Backlink,
    public readonly outboundLink?: OutboundLink,
    public readonly filePath?: string,
    public readonly isFileGroup?: boolean,
    public readonly isStatisticsItem?: boolean,
    public readonly isOutboundGroup?: boolean
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
    } else if (outboundLink) {
      // This is an outbound link item
      this.command = {
        command: 'vscode.open',
        title: 'Open',
        arguments: [vscode.Uri.file(outboundLink.targetFile)]
      };
      this.contextValue = 'outboundLink';
      this.tooltip = new vscode.MarkdownString();
      this.tooltip.appendCodeblock(outboundLink.context, 'markdown');
      this.description = `Line ${outboundLink.sourceLine}`;
      this.iconPath = new vscode.ThemeIcon('arrow-right');
    } else if (isFileGroup) {
      // This is a file group
      this.contextValue = 'backlinkFile';
      this.iconPath = new vscode.ThemeIcon('file-text');
      const backlinkCount = this.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed ?
        this.label.match(/\((\d+)\)$/)?.[1] || '0' : '0';
      this.description = `${backlinkCount} reference${parseInt(backlinkCount) !== 1 ? 's' : ''}`;
    } else if (isStatisticsItem) {
      // This is a statistics item
      this.contextValue = 'statisticsItem';
      this.iconPath = new vscode.ThemeIcon('graph');
    } else if (isOutboundGroup) {
      // This is outbound links group
      this.contextValue = 'outboundGroup';
      this.iconPath = new vscode.ThemeIcon('references');
    }
  }
}

export class MemoInsightsView implements vscode.TreeDataProvider<MemoInsightsTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<MemoInsightsTreeItem | undefined | null | void> = new vscode.EventEmitter<MemoInsightsTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<MemoInsightsTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private currentFile: string | undefined;
  private backlinks: Map<string, Backlink[]> = new Map();
  private outboundLinks: OutboundLink[] = [];
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
    
    // Load backlinks
    const backlinks = await this.backlinkService.getBacklinks(filePath);
    console.log(`[MemoInsights] Loaded ${backlinks.length} backlinks for ${filePath}`);
    this.backlinks.clear();
    backlinks.forEach(backlink => {
      const sourceFile = backlink.sourceFile;
      if (!this.backlinks.has(sourceFile)) {
        this.backlinks.set(sourceFile, []);
      }
      this.backlinks.get(sourceFile)!.push(backlink);
    });

    // Load outbound links
    this.outboundLinks = await this.backlinkService.getOutboundLinks(filePath);
    console.log(`[MemoInsights] Loaded ${this.outboundLinks.length} outbound links for ${filePath}`);

    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: MemoInsightsTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MemoInsightsTreeItem): Promise<MemoInsightsTreeItem[]> {
    console.log(`[MemoInsights] getChildren called with element:`, element?.label || 'root');
    
    if (this.isLoading) {
      return [new MemoInsightsTreeItem('Loading...', vscode.TreeItemCollapsibleState.None)];
    }

    if (!this.currentFile) {
      return [new MemoInsightsTreeItem('No file open', vscode.TreeItemCollapsibleState.None)];
    }

    if (!element) {
      // Root level - show main sections
      const items: MemoInsightsTreeItem[] = [];

      // Note info section
      if (this.currentFile) {
        items.push(new MemoInsightsTreeItem(
          'Note Information',
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          undefined,
          'noteinfo',
          false,
          true
        ));
      }

      // Backlinks section
      const totalBacklinks = Array.from(this.backlinks.values()).reduce((sum, links) => sum + links.length, 0);
      items.push(new MemoInsightsTreeItem(
        `Backlinks (${totalBacklinks})`,
        totalBacklinks > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        'backlinks'
      ));

      // Outbound links section
      items.push(new MemoInsightsTreeItem(
        `Outbound Links (${this.outboundLinks.length})`,
        this.outboundLinks.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None,
        undefined,
        undefined,
        'outbound',
        false,
        false,
        true
      ));

      return items;
    } else if (element.filePath === 'noteinfo') {
      // Show note information
      if (!this.currentFile) {
        return [];
      }

      const items: MemoInsightsTreeItem[] = [];
      try {
        const fileName = path.basename(this.currentFile);
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const relativePath = workspaceFolders && workspaceFolders.length > 0
          ? path.relative(workspaceFolders[0].uri.fsPath, this.currentFile)
          : fileName;
        
        items.push(new MemoInsightsTreeItem(`File: ${fileName}`, vscode.TreeItemCollapsibleState.None));
        items.push(new MemoInsightsTreeItem(`Path: ${relativePath}`, vscode.TreeItemCollapsibleState.None));
        items.push(new MemoInsightsTreeItem(`Backlinks: ${Array.from(this.backlinks.values()).reduce((sum, links) => sum + links.length, 0)}`, vscode.TreeItemCollapsibleState.None));
        items.push(new MemoInsightsTreeItem(`Outbound Links: ${this.outboundLinks.length}`, vscode.TreeItemCollapsibleState.None));
      } catch (error) {
        items.push(new MemoInsightsTreeItem('Error loading note info', vscode.TreeItemCollapsibleState.None));
      }

      return items;
    } else if (element.filePath === 'backlinks') {
      // Show files that contain backlinks
      if (this.backlinks.size === 0) {
        return [new MemoInsightsTreeItem('No backlinks found', vscode.TreeItemCollapsibleState.None)];
      }

      const items: MemoInsightsTreeItem[] = [];
      this.backlinks.forEach((backlinks, sourceFile) => {
        const fileName = path.basename(sourceFile);
        const label = `${fileName} (${backlinks.length})`;
        items.push(new MemoInsightsTreeItem(
          label,
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
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
    } else if (element.filePath === 'outbound') {
      // Show outbound links
      if (this.outboundLinks.length === 0) {
        return [new MemoInsightsTreeItem('No outbound links found', vscode.TreeItemCollapsibleState.None)];
      }

      return this.outboundLinks.map(outboundLink => {
        const fileName = path.basename(outboundLink.targetFile);
        const label = outboundLink.linkText || fileName;
        return new MemoInsightsTreeItem(
          label,
          vscode.TreeItemCollapsibleState.None,
          undefined,
          outboundLink
        );
      });
    } else if (element.isFileGroup && element.filePath) {
      // Show individual backlinks for a file
      const backlinks = this.backlinks.get(element.filePath) || [];
      return backlinks.map(backlink => {
        const label = backlink.linkText || 'Untitled link';
        return new MemoInsightsTreeItem(
          label,
          vscode.TreeItemCollapsibleState.None,
          backlink,
          undefined,
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
    vscode.window.showInformationMessage(
      'Link information is now available in the Memo Links tree view.'
    );
  }
}

// Backward compatibility aliases
export const BacklinkView = MemoInsightsView;
export const BacklinkTreeItem = MemoInsightsTreeItem;