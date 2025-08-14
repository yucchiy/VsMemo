import * as path from 'path';
import { IMemoSearchService, MemoSearchResult } from '../interfaces/IMemoSearchService';
import { IFileService } from '../interfaces/IFileService';
import { IConfigService } from '../interfaces/IConfigService';
import { IMetadataService } from '../interfaces/IMetadataService';

export class MemoSearchService implements IMemoSearchService {
  private searchIndex: Map<string, MemoSearchResult> = new Map();

  constructor(
    private fileService: IFileService,
    private configService: IConfigService,
    private metadataService: IMetadataService,
    private workspaceRoot: string
  ) {}

  async searchMemos(query: string): Promise<MemoSearchResult[]> {
    // インデックスが空の場合は構築
    if (this.searchIndex.size === 0) {
      await this.buildIndex();
    }

    const results: MemoSearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // インデックスから検索
    for (const memo of this.searchIndex.values()) {
      const lowerTitle = memo.title.toLowerCase();
      const lowerFilePath = memo.filePath.toLowerCase();
      
      // タイトルまたはファイルパスに検索キーワードが含まれているか確認
      if (lowerTitle.includes(lowerQuery) || lowerFilePath.includes(lowerQuery)) {
        results.push(memo);
        continue;
      }

      // コンテンツ全体を検索（パフォーマンスを考慮して必要な場合のみ）
      try {
        const content = await this.fileService.readFile(memo.filePath);
        if (content.toLowerCase().includes(lowerQuery)) {
          // マッチした部分の抜粋を作成
          const excerpt = this.createExcerpt(content, query);
          results.push({ ...memo, excerpt });
        }
      } catch (error) {
        console.error(`Error reading file ${memo.filePath}:`, error);
      }
    }

    // 最終更新日でソート（新しい順）
    results.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    return results;
  }

  async buildIndex(): Promise<void> {
    this.searchIndex.clear();
    
    const config = await this.configService.loadConfig();
    
    for (const memoType of config.memoTypes) {
      const memoDir = memoType.baseDir 
        ? path.join(this.workspaceRoot, memoType.baseDir)
        : this.workspaceRoot;

      if (!(await this.fileService.exists(memoDir))) {
        continue;
      }

      try {
        const files = await this.fileService.listFiles(memoDir, ['.md']);
        
        for (const file of files) {
          const filePath = path.join(memoDir, file);
          await this.indexFile(filePath, memoType.name);
        }
      } catch (error) {
        console.error(`Error indexing directory ${memoDir}:`, error);
      }
    }
  }

  private async indexFile(filePath: string, memoTypeName: string): Promise<void> {
    try {
      const content = await this.fileService.readFile(filePath);
      const metadata = this.metadataService.extractMetadata(content);
      
      const title = metadata?.special?.title || path.basename(filePath, '.md');
      const tags = metadata?.special?.tags || [];
      
      const stats = await this.fileService.getStats(filePath);
      
      this.searchIndex.set(filePath, {
        filePath,
        title,
        memoType: memoTypeName,
        tags,
        lastModified: stats.lastModified
      });
    } catch (error) {
      console.error(`Error indexing file ${filePath}:`, error);
    }
  }

  private createExcerpt(content: string, query: string): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);
    
    if (index === -1) {
      return '';
    }

    const excerptLength = 100;
    const start = Math.max(0, index - excerptLength / 2);
    const end = Math.min(content.length, index + query.length + excerptLength / 2);
    
    let excerpt = content.substring(start, end);
    
    // 前後に省略記号を追加
    if (start > 0) {
      excerpt = '...' + excerpt;
    }
    if (end < content.length) {
      excerpt = excerpt + '...';
    }
    
    return excerpt.trim();
  }

  /**
   * ファイルが更新された場合にインデックスを更新
   */
  async updateFile(filePath: string): Promise<void> {
    // ファイルがどのメモタイプに属するか判定
    const config = await this.configService.loadConfig();
    
    for (const memoType of config.memoTypes) {
      const memoDir = memoType.baseDir 
        ? path.join(this.workspaceRoot, memoType.baseDir)
        : this.workspaceRoot;

      if (filePath.startsWith(memoDir)) {
        await this.indexFile(filePath, memoType.name);
        break;
      }
    }
  }

  /**
   * ファイルが削除された場合にインデックスから削除
   */
  removeFile(filePath: string): void {
    this.searchIndex.delete(filePath);
  }
}