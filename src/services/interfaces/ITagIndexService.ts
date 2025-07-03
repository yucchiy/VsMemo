export interface TagInfo {
  tag: string;
  count: number;
}

export interface MemoWithTags {
  filePath: string;
  title: string;
  tags: string[];
  lastModified: Date;
}

export interface ITagIndexService {
  /**
   * Build the complete tag index by scanning all memo files
   */
  buildIndex(): Promise<void>;

  /**
   * Get all tags with their usage count
   */
  getAllTags(): Promise<TagInfo[]>;

  /**
   * Get all memos that have a specific tag
   */
  getMemosByTag(tag: string): Promise<MemoWithTags[]>;

  /**
   * Get all memos that have any of the specified tags
   */
  getMemosByTags(tags: string[], mode: 'AND' | 'OR'): Promise<MemoWithTags[]>;

  /**
   * Update the index for a specific file
   */
  updateFile(filePath: string): Promise<void>;

  /**
   * Remove a file from the index
   */
  removeFile(filePath: string): Promise<void>;
}