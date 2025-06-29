export interface FileStats {
  lastModified: Date;
  isDirectory: boolean;
}

export interface IFileService {
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  openTextDocument(path: string): Promise<void>;
  showTextDocument(path: string): Promise<void>;
  listFiles(dirPath: string, extensions: string[]): Promise<string[]>;
  openFile(path: string): Promise<void>;
  readDirectory(path: string): Promise<string[]>;
  getStats(path: string): Promise<FileStats>;
}