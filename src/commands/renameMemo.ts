import * as vscode from 'vscode';
import * as path from 'path';
import { MemoTreeItem } from '../views/MemoTreeDataProvider';
import { VsCodeFileService } from '../services/implementations/VsCodeFileService';
import { VsCodeConfigService } from '../services/implementations/VsCodeConfigService';
import { BacklinkService } from '../services/implementations/BacklinkService';
import { LinkUpdateService } from '../services/implementations/LinkUpdateService';
import { LoggerService } from '../services/implementations/LoggerService';
import { LogLevel } from '../services/interfaces/ILoggerService';
import { MemoEvents } from '../events/MemoEvents';

export async function renameMemo(treeItem: MemoTreeItem): Promise<void> {
  try {
    if (!treeItem.filePath) {
      vscode.window.showErrorMessage('Cannot rename: Invalid memo file.');
      return;
    }

    const currentPath = treeItem.filePath;
    const currentName = path.basename(currentPath);
    const currentExtension = path.extname(currentPath);
    const currentNameWithoutExt = path.basename(currentPath, currentExtension);

    // Prompt user for new name
    const newName = await vscode.window.showInputBox({
      prompt: 'Enter new memo name',
      value: currentNameWithoutExt,
      validateInput: (value: string) => {
        if (!value || value.trim() === '') {
          return 'Memo name cannot be empty';
        }
        if (value.includes('/') || value.includes('\\')) {
          return 'Memo name cannot contain path separators';
        }
        if (value.includes(':') || value.includes('?') || value.includes('*') ||
            value.includes('<') || value.includes('>') || value.includes('|')) {
          return 'Memo name contains invalid characters';
        }
        return null;
      }
    });

    if (!newName || newName.trim() === '') {
      return; // User cancelled or entered empty name
    }

    const trimmedName = newName.trim();
    if (trimmedName === currentNameWithoutExt) {
      return; // No change needed
    }

    const dirPath = path.dirname(currentPath);
    const newPath = path.join(dirPath, trimmedName + currentExtension);

    const fileService = new VsCodeFileService();

    // Check if target file already exists
    if (await fileService.exists(newPath)) {
      const overwrite = await vscode.window.showWarningMessage(
        `A file named "${trimmedName}${currentExtension}" already exists. Do you want to overwrite it?`,
        'Overwrite',
        'Cancel'
      );

      if (overwrite !== 'Overwrite') {
        return;
      }
    }

    try {
      // Initialize services for link updating
      const configService = new VsCodeConfigService(fileService);
      const logger = new LoggerService(LogLevel.INFO);

      const workspaceFolders = vscode.workspace.workspaceFolders;
      const workspaceRoot = workspaceFolders && workspaceFolders.length > 0
        ? workspaceFolders[0].uri.fsPath
        : '';

      const backlinkService = new BacklinkService(fileService, configService, workspaceRoot, logger);
      const linkUpdateService = new LinkUpdateService(fileService, configService, backlinkService, workspaceRoot);

      // Show progress for potentially long operation
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Renaming memo and updating links...",
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 20, message: "Finding linked files..." });

        // Find files that link to this memo before renaming
        const linkedFiles = await linkUpdateService.findFilesWithLinksTo(currentPath);

        progress.report({ increment: 20, message: "Renaming file..." });

        // Read current content
        const content = await fileService.readFile(currentPath);

        // Write to new location
        await fileService.writeFile(newPath, content);

        // Delete old file
        await vscode.workspace.fs.delete(vscode.Uri.file(currentPath));

        progress.report({ increment: 30, message: "Updating backlinks..." });

        // Update all links that reference this file
        const updateResult = await linkUpdateService.updateLinksAfterRename(currentPath, newPath);

        progress.report({ increment: 30, message: "Finalizing..." });

        // Open the renamed file
        const document = await vscode.workspace.openTextDocument(newPath);
        await vscode.window.showTextDocument(document);

        // Fire memo events for tree refresh
        const memoEvents = MemoEvents.getInstance();
        memoEvents.fireMemoModified(newPath);

        // Show completion message with update statistics
        let message = `Memo renamed to "${trimmedName}${currentExtension}"`;
        if (updateResult.filesUpdated > 0) {
          message += ` • Updated ${updateResult.linksUpdated} link${updateResult.linksUpdated !== 1 ? 's' : ''} in ${updateResult.filesUpdated} file${updateResult.filesUpdated !== 1 ? 's' : ''}`;
        }
        if (updateResult.errors.length > 0) {
          message += ` • ${updateResult.errors.length} error${updateResult.errors.length !== 1 ? 's' : ''} occurred`;
        }

        vscode.window.showInformationMessage(message);

        // Show errors if any
        if (updateResult.errors.length > 0) {
          const showErrors = await vscode.window.showWarningMessage(
            `Some links could not be updated. Show details?`,
            'Show Details',
            'Dismiss'
          );

          if (showErrors === 'Show Details') {
            const errorDetails = updateResult.errors.join('\n');
            vscode.window.showErrorMessage(`Link update errors:\n${errorDetails}`);
          }
        }
      });

    } catch (error) {
      console.error('Error during rename operation:', error);
      vscode.window.showErrorMessage(`Failed to rename memo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

  } catch (error) {
    console.error('Error renaming memo:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to rename memo: ${message}`);
  }
}