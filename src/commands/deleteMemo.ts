import * as vscode from 'vscode';
import * as path from 'path';
import { MemoTreeItem } from '../views/MemoTreeDataProvider';
import { MemoEvents } from '../events/MemoEvents';

export async function deleteMemo(treeItem: MemoTreeItem): Promise<void> {
  try {
    if (!treeItem.filePath) {
      vscode.window.showErrorMessage('Cannot delete: Invalid memo file.');
      return;
    }

    const filePath = treeItem.filePath;
    const fileName = path.basename(filePath);

    // Confirm deletion with user
    const confirmDelete = await vscode.window.showWarningMessage(
      `Are you sure you want to delete "${fileName}"?`,
      {
        modal: true,
        detail: 'This action cannot be undone. The memo file will be permanently deleted.'
      },
      'Delete',
      'Cancel'
    );

    if (confirmDelete !== 'Delete') {
      return; // User cancelled
    }

    try {
      // Delete the file
      await vscode.workspace.fs.delete(vscode.Uri.file(filePath));

      // Fire memo events for tree refresh
      const memoEvents = MemoEvents.getInstance();
      memoEvents.fireMemoDeleted(filePath);

      vscode.window.showInformationMessage(`Memo "${fileName}" deleted successfully`);

      // Close the file if it's currently open
      const openEditors = vscode.window.tabGroups.all.flatMap(group => group.tabs);
      const targetEditor = openEditors.find(tab =>
        tab.input instanceof vscode.TabInputText &&
        tab.input.uri.fsPath === filePath
      );

      if (targetEditor) {
        await vscode.window.tabGroups.close(targetEditor);
      }

    } catch (error) {
      console.error('Error during delete operation:', error);

      if (error instanceof vscode.FileSystemError) {
        if (error.code === 'FileNotFound') {
          vscode.window.showWarningMessage(`File "${fileName}" not found. It may have already been deleted.`);
          // Still fire events to refresh the tree
          const memoEvents = MemoEvents.getInstance();
          memoEvents.fireMemoDeleted(filePath);
        } else {
          vscode.window.showErrorMessage(`Failed to delete memo: ${error.message}`);
        }
      } else {
        vscode.window.showErrorMessage(`Failed to delete memo: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

  } catch (error) {
    console.error('Error deleting memo:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to delete memo: ${message}`);
  }
}