import * as vscode from 'vscode';
import { IGitService } from '../services/interfaces/IGitService';

export async function gitPull(gitService: IGitService): Promise<void> {
  try {
    const isAvailable = await gitService.isAvailable();
    if (!isAvailable) {
      vscode.window.showErrorMessage('Git is not available in the current workspace');
      return;
    }

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Pulling changes from remote...',
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0 });

      const result = await gitService.pull();
      
      if (result.success) {
        let message = 'Pull completed successfully';
        if (result.filesChanged && result.filesChanged > 0) {
          message = `Pulled ${result.filesChanged} files (${result.insertions || 0} insertions, ${result.deletions || 0} deletions)`;
        }
        vscode.window.showInformationMessage(message);
      } else if (result.conflicts && result.conflicts.length > 0) {
        const conflictMessage = `Pull resulted in ${result.conflicts.length} conflict(s). Please resolve them manually.`;
        const action = await vscode.window.showWarningMessage(
          conflictMessage,
          'Show Conflicts'
        );
        
        if (action === 'Show Conflicts') {
          // VS Codeのソース管理ビューを開く
          await vscode.commands.executeCommand('workbench.view.scm');
        }
      } else {
        const errorMessage = result.error || 'Pull failed';
        vscode.window.showErrorMessage(`Git pull failed: ${errorMessage}`);
      }
    });
  } catch (error) {
    console.error('Git pull error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Git pull failed: ${errorMessage}`);
  }
}