import * as path from 'path';
import { ILinkUpdateService, LinkUpdateResult } from '../interfaces/ILinkUpdateService';
import { IFileService } from '../interfaces/IFileService';
import { IConfigService } from '../interfaces/IConfigService';
import { IBacklinkService } from '../interfaces/IBacklinkService';
import { isValidMemoFile } from '../../utils/fileUtils';

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

      // Calculate relative paths for the link update
      const config = await this.configService.loadConfig();
      const baseDir = path.join(this.workspaceRoot, config.baseDir);

      const oldRelativePath = path.relative(baseDir, oldPath);
      const newRelativePath = path.relative(baseDir, newPath);

      // Update each file
      for (const filePath of filesWithLinks) {
        try {
          const updated = await this.updateLinksInFile(filePath, oldRelativePath, newRelativePath);
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
      const config = await this.configService.loadConfig();
      const baseDir = path.join(this.workspaceRoot, config.baseDir);
      const targetRelativePath = path.relative(baseDir, targetPath);
      
      // Get all memo files
      const allFiles = await this.getAllMemoFiles();
      const filesWithLinks: string[] = [];
      
      for (const filePath of allFiles) {
        if (filePath === targetPath) continue; // Skip the target file itself
        
        try {
          const content = await this.fileService.readFile(filePath);
          
          // Check for vsmemo:// links to the target
          const vsmemoLinkPattern = /\[([^\]]*)\]\(vsmemo:\/\/([^)]+)\)/g;
          let match;
          
          while ((match = vsmemoLinkPattern.exec(content)) !== null) {
            const linkPath = decodeURIComponent(match[2]);
            const normalizedLinkPath = linkPath.replace(/\\/g, '/');
            const normalizedTargetPath = targetRelativePath.replace(/\\/g, '/');
            
            if (normalizedLinkPath === normalizedTargetPath) {
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
    oldRelativePath: string,
    newRelativePath: string
  ): Promise<{ linksUpdated: number }> {
    const content = await this.fileService.readFile(filePath);
    let updatedContent = content;
    let linksUpdated = 0;

    // Create encoded versions for URL matching
    const oldEncodedPath = this.encodeVsmemoPath(oldRelativePath);
    const newEncodedPath = this.encodeVsmemoPath(newRelativePath);

    // Normalize paths for comparison (handle both forward and backward slashes)
    const normalizePathForComparison = (p: string) => p.replace(/\\/g, '/');
    const normalizedOldPath = normalizePathForComparison(oldRelativePath);
    const normalizedOldEncodedPath = normalizePathForComparison(oldEncodedPath);

    // Pattern to match vsmemo:// links
    const vsmemoLinkPattern = /\[([^\]]*)\]\(vsmemo:\/\/([^)]+)\)/g;

    updatedContent = updatedContent.replace(vsmemoLinkPattern, (match, linkText, linkPath) => {
      // Decode the link path for comparison
      const decodedLinkPath = decodeURIComponent(linkPath);
      const normalizedDecodedPath = normalizePathForComparison(decodedLinkPath);
      const normalizedLinkPath = normalizePathForComparison(linkPath);

      if (normalizedDecodedPath === normalizedOldPath || normalizedLinkPath === normalizedOldEncodedPath) {
        linksUpdated++;
        return `[${linkText}](vsmemo://${newEncodedPath})`;
      }

      return match;
    });

    // Also handle cases where the link text might need updating if it was derived from filename
    if (linksUpdated > 0) {
      const oldFileName = path.basename(oldRelativePath, path.extname(oldRelativePath));
      const newFileName = path.basename(newRelativePath, path.extname(newRelativePath));

      if (oldFileName !== newFileName) {
        // Update link text that matches the old filename
        const linkTextPattern = new RegExp(`\\[${this.escapeRegExp(oldFileName)}\\]\\(vsmemo:\\/\\/${this.escapeRegExp(newEncodedPath)}\\)`, 'g');
        updatedContent = updatedContent.replace(linkTextPattern, `[${newFileName}](vsmemo://${newEncodedPath})`);
      }
    }

    if (linksUpdated > 0) {
      await this.fileService.writeFile(filePath, updatedContent);
    }

    return { linksUpdated };
  }

  private encodeVsmemoPath(relativePath: string): string {
    // Encode only the path components to preserve forward slashes
    const pathParts = relativePath.split('/');
    const encodedParts = pathParts.map(part => encodeURIComponent(part));
    return encodedParts.join('/');
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}