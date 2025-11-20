import * as vscode from 'vscode';
import { IGitService } from '../services/interfaces/IGitService';

export async function gitSync(gitService: IGitService): Promise<void> {
  try {
    const isAvailable = await gitService.isAvailable();
    if (!isAvailable) {
      vscode.window.showErrorMessage('Git is not available in the current workspace');
      return;
    }

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Syncing with remote...',
      cancellable: false
    }, async (progress) => {
      // ローカルの変更を確認
      progress.report({ increment: 10, message: 'Checking local changes...' });
      const changes = await gitService.getChanges();

      // 1. まずpullを実行
      progress.report({ increment: 30, message: 'Pulling changes from remote...' });
      const pullResult = await gitService.pull();

      if (!pullResult.success) {
        if (pullResult.conflicts && pullResult.conflicts.length > 0) {
          const conflictMessage = `Sync failed: ${pullResult.conflicts.length} conflict(s) detected. Please resolve them before syncing.`;
          const action = await vscode.window.showErrorMessage(
            conflictMessage,
            'Show Conflicts'
          );

          if (action === 'Show Conflicts') {
            await vscode.commands.executeCommand('workbench.view.scm');
          }
        } else {
          const errorMessage = pullResult.error || 'Pull failed';
          vscode.window.showErrorMessage(`Sync failed during pull: ${errorMessage}`);
        }
        return;
      }

      // 2. ローカルの変更がある場合はcommitとpushを実行
      if (changes.length > 0) {
        progress.report({ increment: 50, message: 'Committing local changes...' });

        // すべての変更をステージング
        await gitService.stage([]);

        // コミットメッセージを生成
        const now = new Date();
        const timestamp = now.toISOString().split('T')[0];
        const commitMessage = `Sync memo changes - ${timestamp}`;

        await gitService.commit(commitMessage);

        progress.report({ increment: 70, message: 'Pushing changes to remote...' });
        await gitService.push();
      }

      progress.report({ increment: 100 });

      // 結果を通知
      let message = 'Sync completed successfully';
      if (pullResult.filesChanged && pullResult.filesChanged > 0) {
        message += ` - Pulled ${pullResult.filesChanged} file(s)`;
      }
      if (changes.length > 0) {
        message += ` - Pushed ${changes.length} file(s)`;
      }

      vscode.window.showInformationMessage(message);
    });
  } catch (error) {
    console.error('Git sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Git sync failed: ${errorMessage}`);
  }
}