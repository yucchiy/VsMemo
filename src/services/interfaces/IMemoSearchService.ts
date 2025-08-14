export interface MemoSearchResult {
  filePath: string;
  title: string;
  memoType: string;
  tags: string[];
  lastModified: Date;
  excerpt?: string;
}

export interface IMemoSearchService {
  /**
   * Search memos across all categories by keyword
   * @param query Search keyword
   * @returns Array of matching memos
   */
  searchMemos(query: string): Promise<MemoSearchResult[]>;

  /**
   * Build search index for all memos
   */
  buildIndex(): Promise<void>;
}