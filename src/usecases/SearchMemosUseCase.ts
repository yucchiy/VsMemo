import * as path from 'path';
import { IConfigService } from '../services/interfaces/IConfigService';
import { IFileService } from '../services/interfaces/IFileService';
import { ITagIndexService, TagInfo, MemoWithTags } from '../services/interfaces/ITagIndexService';
import { IWorkspaceService } from './CreateMemoUseCase';

export class SearchMemosUseCase {
  constructor(
    private configService: IConfigService,
    private fileService: IFileService,
    private tagIndexService: ITagIndexService,
    private workspaceService: IWorkspaceService
  ) {}

  async execute(preselectedTag?: string): Promise<void> {
    const workspaceRoot = this.workspaceService.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.workspaceService.showErrorMessage('No workspace folder found. Please open a workspace first.');
      return;
    }

    try {
      // Build index if needed
      await this.tagIndexService.buildIndex();

      if (preselectedTag) {
        // Direct search for a specific tag
        await this.searchByTag(preselectedTag, workspaceRoot);
      } else {
        // Show tag selection UI
        await this.searchWithTagSelection(workspaceRoot);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      this.workspaceService.showErrorMessage(`Failed to search memos: ${message}`);
    }
  }

  private async searchByTag(tag: string, workspaceRoot: string): Promise<void> {
    const memos = await this.tagIndexService.getMemosByTag(tag);

    if (memos.length === 0) {
      this.workspaceService.showInformationMessage(`No memos found with tag: ${tag}`);
      return;
    }

    const selected = await this.selectMemo(memos, workspaceRoot, `Memos with tag "${tag}"`);
    if (selected) {
      await this.fileService.openFile(selected.filePath);
    }
  }

  private async searchWithTagSelection(workspaceRoot: string): Promise<void> {
    const allTags = await this.tagIndexService.getAllTags();

    if (allTags.length === 0) {
      this.workspaceService.showInformationMessage('No tags found in your memos.');
      return;
    }

    // Show tag selection
    const tagItems = allTags.map(tagInfo => ({
      label: tagInfo.tag,
      description: `${tagInfo.count} memo${tagInfo.count !== 1 ? 's' : ''}`,
      detail: `Used in ${tagInfo.count} memo${tagInfo.count !== 1 ? 's' : ''}`,
      tagInfo
    }));

    const selectedTags = await this.workspaceService.showQuickPick(tagItems, {
      placeHolder: 'Select tags to search (you can select multiple)',
      canPickMany: true
    }) as typeof tagItems | undefined;

    if (!selectedTags || selectedTags.length === 0) {
      return;
    }

    if (selectedTags.length === 1) {
      // Single tag search
      await this.searchByTag(selectedTags[0].tagInfo.tag, workspaceRoot);
    } else {
      // Multiple tag search - ask for AND/OR mode
      const searchMode = await this.selectSearchMode();
      if (!searchMode) {
        return;
      }

      const tags = selectedTags.map(item => item.tagInfo.tag);
      const memos = await this.tagIndexService.getMemosByTags(tags, searchMode);

      if (memos.length === 0) {
        const modeText = searchMode === 'AND' ? 'all' : 'any';
        this.workspaceService.showInformationMessage(`No memos found with ${modeText} of the selected tags.`);
        return;
      }

      const tagList = tags.join(', ');
      const modeText = searchMode === 'AND' ? 'all' : 'any';
      const selected = await this.selectMemo(memos, workspaceRoot, `Memos with ${modeText} of: ${tagList}`);
      if (selected) {
        await this.fileService.openFile(selected.filePath);
      }
    }
  }

  private async selectSearchMode(): Promise<'AND' | 'OR' | undefined> {
    const items = [
      {
        label: 'All tags (AND)',
        description: 'Show memos that have ALL selected tags',
        mode: 'AND' as const
      },
      {
        label: 'Any tag (OR)',
        description: 'Show memos that have ANY of the selected tags',
        mode: 'OR' as const
      }
    ];

    const selected = await this.workspaceService.showQuickPick(items, {
      placeHolder: 'Select search mode'
    });

    return selected?.mode;
  }

  private async selectMemo(memos: MemoWithTags[], workspaceRoot: string, title: string): Promise<MemoWithTags | undefined> {
    const items = memos.map(memo => {
      const relativePath = path.relative(workspaceRoot, memo.filePath);
      const tagList = memo.tags.join(', ');

      return {
        label: memo.title,
        description: relativePath,
        detail: `Tags: ${tagList} | Modified: ${memo.lastModified.toLocaleString()}`,
        memo
      };
    });

    const selected = await this.workspaceService.showQuickPick(items, {
      placeHolder: title
    });

    return selected?.memo;
  }
}