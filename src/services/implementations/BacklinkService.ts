import * as path from 'path';
import { IBacklinkService, Backlink, BacklinkIndex, OutboundLink } from '../interfaces/IBacklinkService';
import { IFileService } from '../interfaces/IFileService';
import { IConfigService } from '../interfaces/IConfigService';
import { ILoggerService } from '../interfaces/ILoggerService';
import { isValidMemoFile } from '../../utils/fileUtils';

export class BacklinkService implements IBacklinkService {
  private backlinkIndex: BacklinkIndex = {};
  private workspaceRoot: string;
  private baseDir: string = '';
  private fileExtensions: string[] = ['.md', '.markdown'];

  constructor(
    private fileService: IFileService,
    private configService: IConfigService,
    workspaceRoot: string,
    private logger?: ILoggerService
  ) {
    this.workspaceRoot = workspaceRoot;
  }

  async buildIndex(): Promise<void> {
    this.backlinkIndex = {};

    try {
      this.logger?.info('Building backlink index...');
      const config = await this.configService.loadConfig();
      this.baseDir = config.baseDir;
      this.fileExtensions = config.fileExtensions;

      const searchPath = path.join(this.workspaceRoot, this.baseDir);
      await this.scanDirectory(searchPath);
      this.logger?.info(`Backlink index built successfully. Total entries: ${Object.keys(this.backlinkIndex).length}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger?.error('Error building backlink index', error instanceof Error ? error : new Error(errorMessage));
      throw new Error(`Failed to build backlink index: ${errorMessage}`);
    }
  }

  async getBacklinks(targetFilePath: string): Promise<Backlink[]> {
    // Normalize the target path for consistent comparison
    const normalizedTarget = this.normalizePath(targetFilePath);
    return this.backlinkIndex[normalizedTarget] || [];
  }

  async updateFileBacklinks(filePath: string): Promise<void> {
    // First, remove all existing backlinks from this file
    await this.removeBacklinksFromFile(filePath);

    // Then, scan the file for new backlinks
    if (await this.fileService.exists(filePath)) {
      await this.scanFile(filePath);
    }
  }

  async removeFileFromIndex(filePath: string): Promise<void> {
    const normalizedPath = this.normalizePath(filePath);

    // Remove as a target
    delete this.backlinkIndex[normalizedPath];

    // Remove as a source
    await this.removeBacklinksFromFile(filePath);
  }

  async getOrphanedFiles(): Promise<string[]> {
    const allFiles = new Set<string>();
    const linkedFiles = new Set<string>();

    // Collect all memo files
    const searchPath = path.join(this.workspaceRoot, this.baseDir);
    await this.collectAllFiles(searchPath, allFiles);

    // Collect all files that have links (incoming or outgoing)
    for (const targetPath in this.backlinkIndex) {
      if (this.backlinkIndex[targetPath].length > 0) {
        linkedFiles.add(targetPath);
      }
      this.backlinkIndex[targetPath].forEach(backlink => {
        linkedFiles.add(this.normalizePath(backlink.sourceFile));
      });
    }

    // Find orphaned files
    const orphaned: string[] = [];
    allFiles.forEach(file => {
      if (!linkedFiles.has(file)) {
        orphaned.push(file);
      }
    });

    return orphaned;
  }

  async getLinkStatistics(): Promise<{
    totalLinks: number;
    totalFiles: number;
    averageLinksPerFile: number;
    mostLinkedFiles: Array<{ file: string; count: number }>;
  }> {
    let totalLinks = 0;
    const fileLinkCounts: Map<string, number> = new Map();

    for (const targetPath in this.backlinkIndex) {
      const backlinks = this.backlinkIndex[targetPath];
      totalLinks += backlinks.length;
      fileLinkCounts.set(targetPath, backlinks.length);
    }

    const totalFiles = fileLinkCounts.size;
    const averageLinksPerFile = totalFiles > 0 ? totalLinks / totalFiles : 0;

    // Get top 10 most linked files
    const mostLinkedFiles = Array.from(fileLinkCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, count]) => ({ file, count }));

    return {
      totalLinks,
      totalFiles,
      averageLinksPerFile,
      mostLinkedFiles
    };
  }

  async getOutboundLinks(sourceFilePath: string): Promise<OutboundLink[]> {
    const outboundLinks: OutboundLink[] = [];

    try {
      if (!(await this.fileService.exists(sourceFilePath))) {
        return outboundLinks;
      }

      const content = await this.fileService.readFile(sourceFilePath);
      const lines = content.split('\n');

      const linkRegex = /\[([^\]]*)\]\(vsmemo:\/\/([^)]+)\)/g;

      lines.forEach((line, lineIndex) => {
        let match;
        while ((match = linkRegex.exec(line)) !== null) {
          const linkText = match[1];
          const memoUri = match[2];

          const targetPath = this.resolveMemoPath(memoUri);
          if (targetPath) {
            const context = this.getContext(lines, lineIndex);

            outboundLinks.push({
              targetFile: targetPath,
              linkText,
              sourceLine: lineIndex + 1,
              context
            });
          }
        }
      });
    } catch (error) {
      console.warn(`Failed to get outbound links from ${sourceFilePath}:`, error);
    }

    return outboundLinks;
  }

  private async scanDirectory(dir: string): Promise<void> {
    try {
      if (!(await this.fileService.exists(dir))) {
        return;
      }

      const entries = await this.fileService.readDirectory(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stats = await this.fileService.getStats(fullPath);

        if (stats.isDirectory) {
          await this.scanDirectory(fullPath);
        } else if (isValidMemoFile(entry, this.fileExtensions)) {
          await this.scanFile(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${dir}:`, error);
    }
  }

  private async scanFile(filePath: string): Promise<void> {
    try {
      const content = await this.fileService.readFile(filePath);
      const lines = content.split('\n');

      // Regular expression to match vsmemo:// links
      const linkRegex = /\[([^\]]*)\]\(vsmemo:\/\/([^)]+)\)/g;

      lines.forEach((line, lineIndex) => {
        let match;
        while ((match = linkRegex.exec(line)) !== null) {
          const linkText = match[1];
          const memoUri = match[2];

          // Decode the URI and resolve to absolute path
          const targetPath = this.resolveMemoPath(memoUri);
          if (targetPath) {
            const normalizedTarget = this.normalizePath(targetPath);

            if (!this.backlinkIndex[normalizedTarget]) {
              this.backlinkIndex[normalizedTarget] = [];
            }

            // Get context (current line + surrounding lines)
            const context = this.getContext(lines, lineIndex);

            this.backlinkIndex[normalizedTarget].push({
              sourceFile: filePath,
              sourceLine: lineIndex + 1, // 1-based line numbers
              linkText,
              context
            });
          }
        }
      });
    } catch (error) {
      console.warn(`Failed to scan file ${filePath}:`, error);
    }
  }

  private async removeBacklinksFromFile(filePath: string): Promise<void> {
    // Remove all backlinks that originate from this file
    for (const targetPath in this.backlinkIndex) {
      this.backlinkIndex[targetPath] = this.backlinkIndex[targetPath].filter(
        backlink => backlink.sourceFile !== filePath
      );

      // Clean up empty arrays
      if (this.backlinkIndex[targetPath].length === 0) {
        delete this.backlinkIndex[targetPath];
      }
    }
  }

  private async collectAllFiles(dir: string, files: Set<string>): Promise<void> {
    try {
      if (!(await this.fileService.exists(dir))) {
        return;
      }

      const entries = await this.fileService.readDirectory(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stats = await this.fileService.getStats(fullPath);

        if (stats.isDirectory) {
          await this.collectAllFiles(fullPath, files);
        } else if (isValidMemoFile(entry, this.fileExtensions)) {
          files.add(this.normalizePath(fullPath));
        }
      }
    } catch (error) {
      console.warn(`Failed to collect files from ${dir}:`, error);
    }
  }

  private resolveMemoPath(memoUri: string): string | null {
    try {
      // Decode each path component individually to preserve forward slashes
      const pathParts = memoUri.split('/');
      const decodedParts = pathParts.map(part => decodeURIComponent(part));
      const decodedUri = decodedParts.join('/');

      // Construct the full path
      return path.join(this.workspaceRoot, this.baseDir, decodedUri);
    } catch (error) {
      console.warn('Error resolving memo path:', error);
      return null;
    }
  }

  private normalizePath(filePath: string): string {
    // Normalize path for consistent comparison
    return path.normalize(filePath).toLowerCase();
  }

  private getContext(lines: string[], lineIndex: number, contextLines: number = 2): string {
    const start = Math.max(0, lineIndex - contextLines);
    const end = Math.min(lines.length, lineIndex + contextLines + 1);

    const contextArray = [];
    for (let i = start; i < end; i++) {
      const prefix = i === lineIndex ? '> ' : '  ';
      contextArray.push(prefix + lines[i]);
    }

    return contextArray.join('\n');
  }
}