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

  async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  async createDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async openTextDocument(filePath: string): Promise<void> {
    await vscode.workspace.openTextDocument(filePath);
  }

  async showTextDocument(filePath: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);
  }

  async listFiles(dirPath: string, extensions: string[]): Promise<string[]> {
    try {
      const files: string[] = [];

      const scanDirectory = async (currentPath: string): Promise<void> => {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      };

      await scanDirectory(dirPath);
      return files;
    } catch (error) {
      return [];
    }
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