import * as path from 'path';
import { ILinkUpdateService, LinkUpdateResult } from '../interfaces/ILinkUpdateService';
import { IFileService } from '../interfaces/IFileService';
import { IConfigService } from '../interfaces/IConfigService';
import { IBacklinkService } from '../interfaces/IBacklinkService';
import { isValidMemoFile } from '../../utils/fileUtils';
import { calculateRelativePath, resolveRelativePath } from '../../utils/pathUtils';

export class LinkUpdateService implements ILinkUpdateService {
  constructor(
    private fileService: IFileService,
    private configService: IConfigService,
    private backlinkService: IBacklinkService,
    private workspaceRoot: string
  ) {}

  async updateLinksAfterRename(oldPath: string, newPath: string): Promise<LinkUpdateResult> {
    const result: LinkUpdateResult = {
      filesUpdated: 0,
      linksUpdated: 0,
      errors: []
    };

    try {
      // Find all files that reference the old path
      const filesWithLinks = await this.findFilesWithLinksTo(oldPath);

      if (filesWithLinks.length === 0) {
        return result;
      }

      // Update each file with new relative paths
      for (const filePath of filesWithLinks) {
        try {
          const updated = await this.updateLinksInFile(filePath, oldPath, newPath);
          if (updated.linksUpdated > 0) {
            result.filesUpdated++;
            result.linksUpdated += updated.linksUpdated;
          }
        } catch (error) {
          const errorMsg = `Failed to update links in ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Update backlink index
      await this.backlinkService.removeFileFromIndex(oldPath);
      await this.backlinkService.updateFileBacklinks(newPath);

    } catch (error) {
      const errorMsg = `Failed to update links: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);
    }

    return result;
  }

  async findFilesWithLinksTo(targetPath: string): Promise<string[]> {
    try {
      // Method 1: Use backlink service to find files that reference the target
      const backlinks = await this.backlinkService.getBacklinks(targetPath);
      const sourceFiles = Array.from(new Set(backlinks.map(backlink => backlink.sourceFile)));

      // Method 2: If no backlinks found, try direct file search as fallback
      if (sourceFiles.length === 0) {
        const directSearchFiles = await this.findFilesWithLinksDirectly(targetPath);
        return directSearchFiles;
      }

      return sourceFiles;
    } catch (error) {
      console.error('Error finding files with links:', error);
      return [];
    }
  }

  private async findFilesWithLinksDirectly(targetPath: string): Promise<string[]> {
    try {
      // Get all memo files
      const allFiles = await this.getAllMemoFiles();
      const filesWithLinks: string[] = [];

      for (const filePath of allFiles) {
        if (filePath === targetPath) {continue;} // Skip the target file itself

        try {
          const content = await this.fileService.readFile(filePath);

          // Check for relative path links to .md/.markdown files
          const linkPattern = /\[([^\]]*)\]\((?!https?:\/\/)([^)]+\.(?:md|markdown))\)/g;
          let match;

          while ((match = linkPattern.exec(content)) !== null) {
            const relativeLinkPath = match[2];
            // Resolve the relative path from the source file to get absolute path
            const resolvedPath = resolveRelativePath(filePath, relativeLinkPath);
            const normalizedResolved = path.normalize(resolvedPath).toLowerCase();
            const normalizedTarget = path.normalize(targetPath).toLowerCase();

            if (normalizedResolved === normalizedTarget) {
              filesWithLinks.push(filePath);
              break; // Found a link in this file, no need to continue searching this file
            }
          }
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
        }
      }

      return filesWithLinks;
    } catch (error) {
      console.error('Error in direct file search:', error);
      return [];
    }
  }

  private async getAllMemoFiles(): Promise<string[]> {
    try {
      const config = await this.configService.loadConfig();
      const baseDir = path.join(this.workspaceRoot, config.baseDir);

      // Simple recursive file search
      const files: string[] = [];
      await this.searchMemoFilesRecursively(baseDir, files);
      return files;
    } catch (error) {
      console.error('Error getting all memo files:', error);
      return [];
    }
  }

  private async searchMemoFilesRecursively(dir: string, files: string[]): Promise<void> {
    try {
      const entries = await this.fileService.readDirectory(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = await this.fileService.getStats(fullPath);

        if (stat.isDirectory) {
          await this.searchMemoFilesRecursively(fullPath, files);
        } else if (isValidMemoFile(fullPath, ['.md', '.markdown'])) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible, skip silently
    }
  }

  private async updateLinksInFile(
    filePath: string,
    oldTargetPath: string,
    newTargetPath: string
  ): Promise<{ linksUpdated: number }> {
    const content = await this.fileService.readFile(filePath);
    let updatedContent = content;
    let linksUpdated = 0;

    // Calculate the new relative path from this file to the new target
    const newRelativePath = calculateRelativePath(filePath, newTargetPath);

    // Pattern to match relative path links to .md/.markdown files
    const linkPattern = /\[([^\]]*)\]\((?!https?:\/\/)([^)]+\.(?:md|markdown))\)/g;

    updatedContent = updatedContent.replace(linkPattern, (match, linkText, relativeLinkPath) => {
      // Resolve the relative path to get absolute path
      const resolvedPath = resolveRelativePath(filePath, relativeLinkPath);
      const normalizedResolved = path.normalize(resolvedPath).toLowerCase();
      const normalizedOldTarget = path.normalize(oldTargetPath).toLowerCase();

      if (normalizedResolved === normalizedOldTarget) {
        linksUpdated++;
        return `[${linkText}](${newRelativePath})`;
      }

      return match;
    });

    // Also handle cases where the link text might need updating if it was derived from filename
    if (linksUpdated > 0) {
      const oldFileName = path.basename(oldTargetPath, path.extname(oldTargetPath));
      const newFileName = path.basename(newTargetPath, path.extname(newTargetPath));

      if (oldFileName !== newFileName) {
        // Update link text that matches the old filename
        const escapedNewPath = this.escapeRegExp(newRelativePath);
        const linkTextPattern = new RegExp(`\\[${this.escapeRegExp(oldFileName)}\\]\\(${escapedNewPath}\\)`, 'g');
        updatedContent = updatedContent.replace(linkTextPattern, `[${newFileName}](${newRelativePath})`);
      }
    }

    if (linksUpdated > 0) {
      await this.fileService.writeFile(filePath, updatedContent);
    }

    return { linksUpdated };
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}