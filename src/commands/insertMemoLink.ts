import * as vscode from 'vscode';
import * as path from 'path';
import { VsCodeConfigService } from '../services/implementations/VsCodeConfigService';
import { VsCodeFileService } from '../services/implementations/VsCodeFileService';
import { isValidMemoFile, extractFileNameWithoutExtension } from '../utils/fileUtils';
import { calculateRelativePath } from '../utils/pathUtils';

export async function insertMemoLink(): Promise<void> {
  try {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder is open.');
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const fileService = new VsCodeFileService();
    const configService = new VsCodeConfigService(fileService);

    try {
      const config = await configService.loadConfig();
      const searchPath = path.join(workspaceRoot, config.baseDir);

      // Collect all memo files
      const memoFiles: Array<{ title: string; relativePath: string; fullPath: string }> = [];
      await collectMemoFiles(searchPath, workspaceRoot, config.baseDir, config.fileExtensions, memoFiles, fileService);

      if (memoFiles.length === 0) {
        vscode.window.showInformationMessage('No memo files found.');
        return;
      }

      // Show quick pick for memo selection
      const quickPickItems = memoFiles.map(memo => ({
        label: memo.title,
        description: memo.relativePath,
        memo: memo
      }));

      const selectedItem = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: 'Select memo to link to',
        matchOnDescription: true
      });

      if (!selectedItem) {
        return;
      }

      // Generate memo link with relative path from current file
      const currentFilePath = activeEditor.document.uri.fsPath;
      const linkText = generateMemoLink(selectedItem.memo.title, currentFilePath, selectedItem.memo.fullPath);

      // Insert link at cursor position
      const position = activeEditor.selection.active;
      await activeEditor.edit(editBuilder => {
        editBuilder.insert(position, linkText);
      });

    } catch (error) {
      console.error('Error loading config or searching memos:', error);
      vscode.window.showErrorMessage('Failed to load memos.');
    }

  } catch (error) {
    console.error('Error inserting memo link:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to insert memo link: ${message}`);
  }
}

async function collectMemoFiles(
  searchDir: string,
  workspaceRoot: string,
  baseDir: string,
  fileExtensions: string[],
  memoFiles: Array<{ title: string; relativePath: string; fullPath: string }>,
  fileService: VsCodeFileService
): Promise<void> {
  try {
    if (!(await fileService.exists(searchDir))) {
      return;
    }

    const entries = await fileService.readDirectory(searchDir);

    for (const entry of entries) {
      const fullPath = path.join(searchDir, entry);
      const stats = await fileService.getStats(fullPath);

      if (stats.isDirectory) {
        // Recursively search subdirectories
        await collectMemoFiles(fullPath, workspaceRoot, baseDir, fileExtensions, memoFiles, fileService);
      } else if (isValidMemoFile(entry, fileExtensions)) {
        try {
          const content = await fileService.readFile(fullPath);
          const title = extractTitleFromContent(content, entry, fileExtensions);
          const relativePath = path.relative(path.join(workspaceRoot, baseDir), fullPath);

          memoFiles.push({
            title,
            relativePath,
            fullPath
          });
        } catch (error) {
          console.warn(`Failed to read memo file ${fullPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to search directory ${searchDir}:`, error);
  }
}

function extractTitleFromContent(content: string, fileName: string, fileExtensions: string[]): string {
  // Try to get title from frontmatter first
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatterText = frontmatterMatch[1];
    const titleMatch = frontmatterText.match(/^title:\s*(.*)$/m);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
  }

  // Try to extract from first heading
  const headingMatch = content.match(/^#{1,6}\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  // Fall back to filename without extension
  return extractFileNameWithoutExtension(fileName, fileExtensions);
}

function generateMemoLink(title: string, fromFile: string, toFile: string): string {
  const relativePath = calculateRelativePath(fromFile, toFile);
  return `[${title}](${relativePath})`;
}