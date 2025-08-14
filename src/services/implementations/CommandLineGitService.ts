import * as vscode from 'vscode';
import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import { IGitService, GitChange, PullResult } from '../interfaces/IGitService';

export class CommandLineGitService implements IGitService {
  private git?: SimpleGit;
  private workspaceRoot?: string;

  async isAvailable(): Promise<boolean> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return false;
      }

      this.workspaceRoot = workspaceFolders[0].uri.fsPath;
      this.git = simpleGit(this.workspaceRoot);

      // Test if git is available and this is a git repository
      await this.git.status();
      return true;
    } catch (error) {
      console.warn('CommandLineGitService availability check failed:', error);
      return false;
    }
  }

  async getChanges(): Promise<GitChange[]> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    const status: StatusResult = await this.git.status();
    const changes: GitChange[] = [];

    // Modified files
    for (const file of status.modified) {
      changes.push({
        uri: this.getAbsolutePath(file),
        type: 'modified'
      });
    }

    // Added/new files
    for (const file of status.created) {
      changes.push({
        uri: this.getAbsolutePath(file),
        type: 'added'
      });
    }

    // Deleted files
    for (const file of status.deleted) {
      changes.push({
        uri: this.getAbsolutePath(file),
        type: 'deleted'
      });
    }

    // Renamed files
    for (const file of status.renamed) {
      changes.push({
        uri: this.getAbsolutePath(file.to || file.from),
        type: 'renamed'
      });
    }

    // Untracked files
    for (const file of status.not_added) {
      changes.push({
        uri: this.getAbsolutePath(file),
        type: 'untracked'
      });
    }

    return changes;
  }

  async stage(files: string[]): Promise<void> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    if (files.length === 0) {
      // Stage all changes
      await this.git.add('.');
    } else {
      // Convert absolute paths to relative paths for git command
      const relativePaths = files.map(file => this.getRelativePath(file));
      await this.git.add(relativePaths);
    }
  }

  async commit(message: string): Promise<void> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    await this.git.commit(message);
  }

  async push(): Promise<void> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    await this.git.push();
  }

  async pull(): Promise<PullResult> {
    if (!this.git) {
      throw new Error('Git service not initialized');
    }

    try {
      const result = await this.git.pull();
      
      // コンフリクトの検出
      const status = await this.git.status();
      const conflicts = status.conflicted;
      
      return {
        success: conflicts.length === 0,
        filesChanged: result.summary.changes,
        insertions: result.summary.insertions,
        deletions: result.summary.deletions,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Pull failed'
      };
    }
  }

  getServiceName(): string {
    return 'Command Line Git';
  }

  private getAbsolutePath(relativePath: string): string {
    if (!this.workspaceRoot) {
      throw new Error('Workspace root not initialized');
    }

    // Handle both forward and backward slashes
    const normalizedPath = relativePath.replace(/\\/g, '/');
    return `${this.workspaceRoot}/${normalizedPath}`.replace(/\/+/g, '/');
  }

  private getRelativePath(absolutePath: string): string {
    if (!this.workspaceRoot) {
      throw new Error('Workspace root not initialized');
    }

    if (absolutePath.startsWith(this.workspaceRoot)) {
      return absolutePath.substring(this.workspaceRoot.length + 1);
    }

    return absolutePath;
  }
}