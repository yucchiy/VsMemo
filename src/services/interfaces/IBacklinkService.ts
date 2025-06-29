export interface Backlink {
  sourceFile: string;
  sourceLine: number;
  linkText: string;
  context: string;
}

export interface BacklinkIndex {
  [targetPath: string]: Backlink[];
}

export interface IBacklinkService {
  /**
   * Build or rebuild the backlink index for all memo files
   */
  buildIndex(): Promise<void>;

  /**
   * Get all backlinks pointing to a specific file
   */
  getBacklinks(targetFilePath: string): Promise<Backlink[]>;

  /**
   * Update backlinks for a specific file (incremental update)
   */
  updateFileBacklinks(filePath: string): Promise<void>;

  /**
   * Remove a file from the backlink index
   */
  removeFileFromIndex(filePath: string): Promise<void>;

  /**
   * Get files that have no incoming or outgoing links
   */
  getOrphanedFiles(): Promise<string[]>;

  /**
   * Get link statistics for analytics
   */
  getLinkStatistics(): Promise<{
    totalLinks: number;
    totalFiles: number;
    averageLinksPerFile: number;
    mostLinkedFiles: Array<{ file: string; count: number }>;
  }>;
}