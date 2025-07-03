export interface LinkUpdateResult {
  filesUpdated: number;
  linksUpdated: number;
  errors: string[];
}

export interface ILinkUpdateService {
  /**
   * Update all links that reference the old file path to point to the new file path
   */
  updateLinksAfterRename(oldPath: string, newPath: string): Promise<LinkUpdateResult>;

  /**
   * Find all files that contain links to the specified file
   */
  findFilesWithLinksTo(targetPath: string): Promise<string[]>;
}