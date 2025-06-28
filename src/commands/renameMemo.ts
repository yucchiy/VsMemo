import * as vscode from 'vscode';
import * as path from 'path';
import { MemoTreeItem } from '../views/MemoTreeDataProvider';
import { VsCodeFileService } from '../services/implementations/VsCodeFileService';
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
      // Read current content
      const content = await fileService.readFile(currentPath);

      // Write to new location
      await fileService.writeFile(newPath, content);

      // Delete old file
      await vscode.workspace.fs.delete(vscode.Uri.file(currentPath));

      // Open the renamed file
      const document = await vscode.workspace.openTextDocument(newPath);
      await vscode.window.showTextDocument(document);

      // Fire memo events for tree refresh
      const memoEvents = MemoEvents.getInstance();
      memoEvents.fireMemoModified(newPath);

      vscode.window.showInformationMessage(`Memo renamed to "${trimmedName}${currentExtension}"`);

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