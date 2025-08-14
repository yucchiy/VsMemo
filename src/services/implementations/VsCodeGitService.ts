import * as vscode from 'vscode';
import { IGitService, GitChange, PullResult } from '../interfaces/IGitService';
import { GitExtension, Repository } from '../../git';

export class VsCodeGitService implements IGitService {
  private repository?: Repository;

  async isAvailable(): Promise<boolean> {
    try {
      const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
      if (!gitExtension) {
        return false;
      }

      const git = gitExtension.exports;
      const api = git.getAPI(1);
      if (!api) {
        return false;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return false;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      this.repository = api.repositories.find(repo =>
        workspaceRoot.startsWith(repo.rootUri.fsPath)
      );

      return !!this.repository;
    } catch (error) {
      console.warn('VsCodeGitService availability check failed:', error);
      return false;
    }
  }

  async getChanges(): Promise<GitChange[]> {
    if (!this.repository) {
      throw new Error('Git repository not available');
    }

    const changes: GitChange[] = [];

    // Working tree changes (modified, added, deleted files)
    for (const change of this.repository.state.workingTreeChanges) {
      changes.push({
        uri: change.uri.fsPath,
        type: this.mapChangeType(change.status)
      });
    }

    // Index changes (staged files)
    for (const change of this.repository.state.indexChanges) {
      changes.push({
        uri: change.uri.fsPath,
        type: this.mapChangeType(change.status)
      });
    }

    return changes;
  }

  async stage(files: string[]): Promise<void> {
    if (!this.repository) {
      throw new Error('Git repository not available');
    }

    if (files.length === 0) {
      // Stage all changes
      await this.repository.add([]);
    } else {
      // Stage specific files
      await this.repository.add(files);
    }
  }

  async commit(message: string): Promise<void> {
    if (!this.repository) {
      throw new Error('Git repository not available');
    }

    await this.repository.commit(message);
  }

  async push(): Promise<void> {
    if (!this.repository) {
      throw new Error('Git repository not available');
    }

    await this.repository.push();
  }

  async pull(): Promise<PullResult> {
    if (!this.repository) {
      throw new Error('Git repository not available');
    }

    try {
      await this.repository.pull();
      
      // VS Code Git APIではpull結果の詳細情報が取得できないため、
      // シンプルな成功/失敗のみを返す
      const mergeChanges = this.repository.state.mergeChanges;
      const hasConflicts = mergeChanges.length > 0;
      
      return {
        success: !hasConflicts,
        conflicts: hasConflicts ? mergeChanges.map(change => change.uri.fsPath) : undefined
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Pull failed'
      };
    }
  }

  getServiceName(): string {
    return 'VS Code Git API';
  }

  private mapChangeType(status: number): GitChange['type'] {
    // VS Code Git API status codes mapping
    // These are based on the Git status codes used by VS Code
    switch (status) {
      case 0: // INDEX_MODIFIED
      case 1: // MODIFIED
        return 'modified';
      case 2: // ADDED
      case 3: // INDEX_ADDED
        return 'added';
      case 4: // DELETED
      case 5: // INDEX_DELETED
        return 'deleted';
      case 6: // INDEX_RENAMED
        return 'renamed';
      case 7: // UNTRACKED
        return 'untracked';
      default:
        return 'modified';
    }
  }
}