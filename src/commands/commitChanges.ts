import * as vscode from 'vscode';
import * as path from 'path';
import { GitServiceManager } from '../services/GitServiceManager';

export async function commitChanges(): Promise<void> {
  const gitManager = new GitServiceManager();

  // Check if any Git service is available
  const isAvailable = await gitManager.isAvailable();
  if (!isAvailable) {
    vscode.window.showErrorMessage('No Git service is available. Please ensure Git is installed and this workspace is a Git repository.');
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('No workspace folder is open.');
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;

  try {
    // Get all changes using the Git service
    const allChanges = await gitManager.getChanges();
    if (allChanges.length === 0) {
      vscode.window.showInformationMessage('No changes to commit.');
      return;
    }

    // Get memo-related changes
    const config = vscode.workspace.getConfiguration('vsmemo');
    const baseDir = config.get<string>('baseDir') || '.';
    const memoPath = path.join(workspaceRoot, baseDir);

    const memoChanges = allChanges.filter(change =>
      change.uri.startsWith(memoPath)
    );

    if (memoChanges.length === 0) {
      vscode.window.showInformationMessage('No memo changes to commit.');
      return;
    }

    // Show quick pick to select commit scope
    const commitScope = await vscode.window.showQuickPick([
      { label: 'Memo changes only', value: 'memo' },
      { label: 'All changes', value: 'all' }
    ], {
      placeHolder: 'Select commit scope'
    });

    if (!commitScope) {
      return;
    }

    // Get commit message
    const commitMessage = await vscode.window.showInputBox({
      prompt: 'Enter commit message',
      placeHolder: 'Update memos',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Commit message cannot be empty';
        }
        return null;
      }
    });

    if (!commitMessage) {
      return;
    }

    // Stage and commit using the Git service with fallback
    await gitManager.executeWithFallback(async (service) => {
      if (commitScope.value === 'memo') {
        // Stage only memo files
        const memoPaths = memoChanges.map(change => change.uri);
        await service.stage(memoPaths);
      } else {
        // Stage all changes
        await service.stage([]);
      }

      // Commit the changes
      await service.commit(commitMessage);
    }, 'commit operation');

    vscode.window.showInformationMessage(`Successfully committed with ${gitManager.getServiceName()}: ${commitMessage}`);

    // Optionally ask if user wants to push
    const pushChoice = await vscode.window.showQuickPick([
      { label: 'Yes', value: true },
      { label: 'No', value: false }
    ], {
      placeHolder: 'Push changes to remote?'
    });

    if (pushChoice && pushChoice.value) {
      try {
        await gitManager.executeWithFallback(async (service) => {
          await service.push();
        }, 'push operation');

        vscode.window.showInformationMessage('Changes pushed to remote.');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to push: ${error}`);
      }
    }

  } catch (error) {
    vscode.window.showErrorMessage(`Failed to commit: ${error}`);
  }
}