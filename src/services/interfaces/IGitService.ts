export interface GitChange {
  uri: string;
  type: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
}

export interface PullResult {
  success: boolean;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
  conflicts?: string[];
  error?: string;
}

export interface IGitService {
  /**
   * Check if this Git service is available in the current environment
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get all changes in the repository
   */
  getChanges(): Promise<GitChange[]>;

  /**
   * Stage specific files for commit
   * @param files Array of file paths to stage. Empty array stages all changes.
   */
  stage(files: string[]): Promise<void>;

  /**
   * Commit staged changes with a message
   * @param message Commit message
   */
  commit(message: string): Promise<void>;

  /**
   * Push commits to remote repository
   */
  push(): Promise<void>;

  /**
   * Pull changes from remote repository
   * @returns Result of the pull operation
   */
  pull(): Promise<PullResult>;

  /**
   * Get the name/identifier of this Git service implementation
   */
  getServiceName(): string;
}