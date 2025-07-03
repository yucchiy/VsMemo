import * as path from 'path';
import { ITagIndexService, TagInfo, MemoWithTags } from '../interfaces/ITagIndexService';
import { IFileService } from '../interfaces/IFileService';
import { IConfigService } from '../interfaces/IConfigService';
import { IMetadataService } from '../interfaces/IMetadataService';
import { isValidMemoFile, extractFileNameWithoutExtension } from '../../utils/fileUtils';

export class TagIndexService implements ITagIndexService {
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> file paths
  private fileTagsCache: Map<string, { tags: string[]; title: string; lastModified: Date }> = new Map(); // file path -> tags and metadata
  private isIndexing = false;

  constructor(
    private fileService: IFileService,
    private configService: IConfigService,
    private metadataService: IMetadataService,
    private workspaceRoot: string
  ) {}

  async buildIndex(): Promise<void> {
    if (this.isIndexing) {
      console.log('[TagIndexService] Index building already in progress');
      return;
    }

    this.isIndexing = true;
    console.log('[TagIndexService] Building tag index...');

    try {
      // Clear existing index
      this.tagIndex.clear();
      this.fileTagsCache.clear();

      const config = await this.configService.loadConfig();
      const searchDir = path.join(this.workspaceRoot, config.baseDir);

      if (await this.fileService.exists(searchDir)) {
        await this.scanDirectory(searchDir, config.fileExtensions);
      }

      console.log(`[TagIndexService] Index built with ${this.tagIndex.size} unique tags`);
    } finally {
      this.isIndexing = false;
    }
  }

  async getAllTags(): Promise<TagInfo[]> {
    const tagInfos: TagInfo[] = [];

    for (const [tag, filePaths] of this.tagIndex.entries()) {
      tagInfos.push({
        tag,
        count: filePaths.size
      });
    }

    // Sort by count (descending) and then by tag name
    return tagInfos.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.tag.localeCompare(b.tag);
    });
  }

  async getMemosByTag(tag: string): Promise<MemoWithTags[]> {
    const filePaths = this.tagIndex.get(tag);
    if (!filePaths || filePaths.size === 0) {
      return [];
    }

    const memos: MemoWithTags[] = [];

    for (const filePath of filePaths) {
      const cachedData = this.fileTagsCache.get(filePath);
      if (cachedData) {
        memos.push({
          filePath,
          title: cachedData.title,
          tags: cachedData.tags,
          lastModified: cachedData.lastModified
        });
      }
    }

    // Sort by last modified date (newest first)
    return memos.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }

  async getMemosByTags(tags: string[], mode: 'AND' | 'OR'): Promise<MemoWithTags[]> {
    if (tags.length === 0) {
      return [];
    }

    if (tags.length === 1) {
      return this.getMemosByTag(tags[0]);
    }

    // Get file sets for each tag
    const fileSets = tags.map(tag => this.tagIndex.get(tag) || new Set<string>());

    let resultFiles: Set<string>;

    if (mode === 'AND') {
      // Intersection - files must have all tags
      resultFiles = new Set(fileSets[0]);
      for (let i = 1; i < fileSets.length; i++) {
        resultFiles = new Set([...resultFiles].filter(file => fileSets[i].has(file)));
      }
    } else {
      // Union - files can have any of the tags
      resultFiles = new Set<string>();
      for (const fileSet of fileSets) {
        for (const file of fileSet) {
          resultFiles.add(file);
        }
      }
    }

    const memos: MemoWithTags[] = [];

    for (const filePath of resultFiles) {
      const cachedData = this.fileTagsCache.get(filePath);
      if (cachedData) {
        memos.push({
          filePath,
          title: cachedData.title,
          tags: cachedData.tags,
          lastModified: cachedData.lastModified
        });
      }
    }

    return memos.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }

  async updateFile(filePath: string): Promise<void> {
    console.log(`[TagIndexService] Updating index for file: ${filePath}`);

    // Remove old entries
    this.removeFileFromIndex(filePath);

    // Add new entries
    try {
      const content = await this.fileService.readFile(filePath);
      const metadata = this.metadataService.extractMetadata(content);

      if (metadata && metadata.special.tags && metadata.special.tags.length > 0) {
        const stats = await this.fileService.getStats(filePath);
        const title = metadata.special.title || await this.extractTitleFromContent(content, filePath);

        // Update cache
        this.fileTagsCache.set(filePath, {
          tags: metadata.special.tags,
          title,
          lastModified: stats.lastModified
        });

        // Update index
        for (const tag of metadata.special.tags) {
          if (!this.tagIndex.has(tag)) {
            this.tagIndex.set(tag, new Set());
          }
          this.tagIndex.get(tag)!.add(filePath);
        }
      }
    } catch (error) {
      console.warn(`[TagIndexService] Failed to update file ${filePath}:`, error);
    }
  }

  async removeFile(filePath: string): Promise<void> {
    this.removeFileFromIndex(filePath);
  }

  private removeFileFromIndex(filePath: string): void {
    const cachedData = this.fileTagsCache.get(filePath);
    if (cachedData) {
      // Remove from tag index
      for (const tag of cachedData.tags) {
        const filePaths = this.tagIndex.get(tag);
        if (filePaths) {
          filePaths.delete(filePath);
          if (filePaths.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }
      // Remove from cache
      this.fileTagsCache.delete(filePath);
    }
  }

  private async scanDirectory(dir: string, fileExtensions: string[]): Promise<void> {
    try {
      const entries = await this.fileService.readDirectory(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stats = await this.fileService.getStats(fullPath);

        if (stats.isDirectory) {
          await this.scanDirectory(fullPath, fileExtensions);
        } else if (isValidMemoFile(entry, fileExtensions)) {
          await this.scanFile(fullPath, stats.lastModified);
        }
      }
    } catch (error) {
      console.error(`[TagIndexService] Failed to scan directory ${dir}:`, error);
    }
  }

  private async scanFile(filePath: string, lastModified: Date): Promise<void> {
    try {
      const content = await this.fileService.readFile(filePath);
      const metadata = this.metadataService.extractMetadata(content);

      if (metadata && metadata.special.tags && metadata.special.tags.length > 0) {
        const title = metadata.special.title || await this.extractTitleFromContent(content, filePath);

        // Update cache
        this.fileTagsCache.set(filePath, {
          tags: metadata.special.tags,
          title,
          lastModified
        });

        // Update index
        for (const tag of metadata.special.tags) {
          if (!this.tagIndex.has(tag)) {
            this.tagIndex.set(tag, new Set());
          }
          this.tagIndex.get(tag)!.add(filePath);
        }
      }
    } catch (error) {
      console.warn(`[TagIndexService] Failed to scan file ${filePath}:`, error);
    }
  }

  private async extractTitleFromContent(content: string, filePath: string): Promise<string> {
    // Try to extract from first heading
    const lines = content.split('\n');
    let inFrontmatter = false;

    for (const line of lines) {
      if (line === '---') {
        inFrontmatter = !inFrontmatter;
        continue;
      }

      if (!inFrontmatter && line.trim().startsWith('#')) {
        return line.replace(/^#+\s*/, '').trim();
      }
    }

    // Fall back to filename
    const config = await this.configService.loadConfig();
    return extractFileNameWithoutExtension(path.basename(filePath), config.fileExtensions || ['.md']);
  }
}