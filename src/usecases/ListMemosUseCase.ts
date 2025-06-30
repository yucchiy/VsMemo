import { IConfigService } from '../services/interfaces/IConfigService';
import { IFileService } from '../services/interfaces/IFileService';
import { MemoType } from '../models/MemoType';
import { IWorkspaceService } from './CreateMemoUseCase';
import { isValidMemoFile, extractFileNameWithoutExtension } from '../utils/fileUtils';
import * as path from 'path';

export interface MemoItem {
  title: string;
  filePath: string;
  relativePath: string;
  lastModified: Date;
}

export class ListMemosUseCase {
  constructor(
    private configService: IConfigService,
    private fileService: IFileService,
    private workspaceService: IWorkspaceService
  ) {}

  async execute(): Promise<void> {
    const workspaceRoot = this.workspaceService.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.workspaceService.showErrorMessage('No workspace folder found. Please open a workspace first.');
      return;
    }

    try {
      const config = await this.configService.loadConfig();

      if (config.memoTypes.length === 0) {
        this.workspaceService.showErrorMessage('No memo types configured. Please check your .vsmemo/config.json file.');
        return;
      }

      const selectedMemoType = await this.selectMemoType(config.memoTypes);
      if (!selectedMemoType) {
        return;
      }

      const memos = await this.findMemosByType(workspaceRoot, config.baseDir, selectedMemoType, config.fileExtensions);

      if (memos.length === 0) {
        this.workspaceService.showErrorMessage(`No memos found for type: ${selectedMemoType.name}`);
        return;
      }

      const selectedMemo = await this.selectMemo(memos);
      if (selectedMemo) {
        await this.fileService.openFile(selectedMemo.filePath);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      this.workspaceService.showErrorMessage(`Failed to list memos: ${message}`);
    }
  }

  private async selectMemoType(memoTypes: MemoType[]): Promise<MemoType | undefined> {
    const items = memoTypes.map(type => ({
      label: type.name,
      memoType: type
    }));

    const selected = await this.workspaceService.showQuickPick(items, {
      placeHolder: 'Select memo type to list'
    });

    return selected?.memoType;
  }

  private async findMemosByType(workspaceRoot: string, baseDir: string, memoType: MemoType, fileExtensions: string[]): Promise<MemoItem[]> {
    const memoDir = path.join(workspaceRoot, baseDir);

    if (!await this.fileService.exists(memoDir)) {
      return [];
    }

    const memos: MemoItem[] = [];

    await this.searchMemosRecursively(memoDir, workspaceRoot, memos, memoType, fileExtensions);

    return memos.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }

  private async searchMemosRecursively(dir: string, workspaceRoot: string, memos: MemoItem[], targetMemoType: MemoType, fileExtensions: string[]): Promise<void> {
    const entries = await this.getDirectoryEntries(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);

      if (await this.isDirectory(fullPath)) {
        await this.searchMemosRecursively(fullPath, workspaceRoot, memos, targetMemoType, fileExtensions);
      } else if (isValidMemoFile(entry, fileExtensions)) {
        try {
          const content = await this.fileService.readFile(fullPath);
          const frontmatter = this.extractFrontmatter(content);

          // Filter by memo type
          if (frontmatter?.type === targetMemoType.id) {
            const title = this.extractTitleFromContent(content, entry, fileExtensions);
            const stats = await this.getFileStats(fullPath);
            const relativePath = path.relative(workspaceRoot, fullPath);

            memos.push({
              title,
              filePath: fullPath,
              relativePath,
              lastModified: stats.lastModified
            });
          }
        } catch (error) {
        }
      }
    }
  }

  private async getDirectoryEntries(dir: string): Promise<string[]> {
    return await this.fileService.readDirectory(dir);
  }

  private async isDirectory(path: string): Promise<boolean> {
    const stats = await this.fileService.getStats(path);
    return stats.isDirectory;
  }

  private async getFileStats(filePath: string): Promise<{ lastModified: Date }> {
    const stats = await this.fileService.getStats(filePath);
    return { lastModified: stats.lastModified };
  }

  private extractFrontmatter(content: string): Record<string, string> | null {
    const lines = content.split('\n');

    if (lines[0] !== '---') {
      return null;
    }

    const endIndex = lines.slice(1).findIndex(line => line === '---');
    if (endIndex === -1) {
      return null;
    }

    const frontmatterLines = lines.slice(1, endIndex + 1);
    const frontmatter: Record<string, string> = {};

    for (const line of frontmatterLines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        frontmatter[key] = value;
      }
    }

    return frontmatter;
  }

  private extractTitleFromContent(content: string, fileName: string, fileExtensions: string[]): string {
    const frontmatter = this.extractFrontmatter(content);

    if (frontmatter?.title) {
      return frontmatter.title;
    }

    const lines = content.split('\n');
    let frontmatterEnd = -1;

    if (lines[0] === '---') {
      const endIndex = lines.slice(1).findIndex(line => line === '---');
      if (endIndex !== -1) {
        frontmatterEnd = endIndex + 1;
      }
    }

    const contentStart = frontmatterEnd + 1;
    for (let i = contentStart; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('# ')) {
        return line.substring(2).trim();
      }
      if (line && !line.startsWith('#')) {
        break;
      }
    }

    return extractFileNameWithoutExtension(fileName, fileExtensions);
  }

  private async selectMemo(memos: MemoItem[]): Promise<MemoItem | undefined> {
    const items = memos.map(memo => ({
      label: memo.title,
      description: memo.relativePath,
      detail: `Last modified: ${memo.lastModified.toLocaleString()}`,
      memo
    }));

    const selected = await this.workspaceService.showQuickPick(items, {
      placeHolder: 'Select memo to open'
    });

    return selected?.memo;
  }
}