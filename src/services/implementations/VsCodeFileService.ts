import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IFileService, FileStats } from '../interfaces/IFileService';

export class VsCodeFileService implements IFileService {
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async createDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async openFile(filePath: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);
  }

  async readDirectory(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath);
    return entries;
  }

  async getStats(filePath: string): Promise<FileStats> {
    const stats = await fs.stat(filePath);
    return {
      lastModified: stats.mtime,
      isDirectory: stats.isDirectory()
    };
  }
}