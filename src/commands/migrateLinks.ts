import * as vscode from 'vscode';
import * as path from 'path';
import { VsCodeConfigService } from '../services/implementations/VsCodeConfigService';
import { VsCodeFileService } from '../services/implementations/VsCodeFileService';
import { isValidMemoFile } from '../utils/fileUtils';
import { calculateRelativePath } from '../utils/pathUtils';

export async function migrateLinks(): Promise<void> {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder is open.');
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const fileService = new VsCodeFileService();
    const configService = new VsCodeConfigService(fileService);

    const config = await configService.loadConfig();
    const baseDir = path.join(workspaceRoot, config.baseDir);

    // Confirm with user
    const confirm = await vscode.window.showWarningMessage(
      'This will migrate all vsmemo:// links to relative paths. This operation cannot be undone. Continue?',
      'Yes',
      'No'
    );

    if (confirm !== 'Yes') {
      return;
    }

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Migrating links to relative paths',
      cancellable: false
    }, async (progress) => {
      // Collect all memo files
      const allFiles: string[] = [];
      await collectMemoFiles(baseDir, config.fileExtensions, allFiles, fileService);

      let totalFilesUpdated = 0;
      let totalLinksUpdated = 0;

      for (let i = 0; i < allFiles.length; i++) {
        const filePath = allFiles[i];
        progress.report({
          message: `Processing ${i + 1}/${allFiles.length}`,
          increment: (100 / allFiles.length)
        });

        const result = await migrateLinksInFile(filePath, workspaceRoot, config.baseDir, fileService);
        if (result.linksUpdated > 0) {
          totalFilesUpdated++;
          totalLinksUpdated += result.linksUpdated;
        }
      }

      if (totalLinksUpdated > 0) {
        vscode.window.showInformationMessage(
          `Migration complete: ${totalLinksUpdated} links updated in ${totalFilesUpdated} files.`
        );
      } else {
        vscode.window.showInformationMessage('No vsmemo:// links found to migrate.');
      }
    });

  } catch (error) {
    console.error('Error migrating links:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to migrate links: ${message}`);
  }
}

async function collectMemoFiles(
  dir: string,
  fileExtensions: string[],
  files: string[],
  fileService: VsCodeFileService
): Promise<void> {
  try {
    if (!(await fileService.exists(dir))) {
      return;
    }

    const entries = await fileService.readDirectory(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stats = await fileService.getStats(fullPath);

      if (stats.isDirectory) {
        await collectMemoFiles(fullPath, fileExtensions, files, fileService);
      } else if (isValidMemoFile(entry, fileExtensions)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Failed to search directory ${dir}:`, error);
  }
}

async function migrateLinksInFile(
  filePath: string,
  workspaceRoot: string,
  baseDirName: string,
  fileService: VsCodeFileService
): Promise<{ linksUpdated: number }> {
  try {
    const content = await fileService.readFile(filePath);
    let updatedContent = content;
    let linksUpdated = 0;

    // Pattern to match vsmemo:// links
    const vsmemoLinkPattern = /\[([^\]]*)\]\(vsmemo:\/\/([^)]+)\)/g;

    updatedContent = updatedContent.replace(vsmemoLinkPattern, (match, linkText, memoUri) => {
      try {
        // Decode each path component
        const pathParts = memoUri.split('/');
        const decodedParts = pathParts.map((part: string) => decodeURIComponent(part));
        const decodedUri = decodedParts.join('/');

        // Resolve to absolute path
        const targetAbsPath = path.join(workspaceRoot, baseDirName, decodedUri);

        // Calculate relative path from current file to target
        const relativePath = calculateRelativePath(filePath, targetAbsPath);

        linksUpdated++;
        return `[${linkText}](${relativePath})`;
      } catch (error) {
        console.warn(`Failed to migrate link: ${match}`, error);
        return match;
      }
    });

    if (linksUpdated > 0) {
      await fileService.writeFile(filePath, updatedContent);
    }

    return { linksUpdated };
  } catch (error) {
    console.warn(`Failed to migrate links in ${filePath}:`, error);
    return { linksUpdated: 0 };
  }
}
