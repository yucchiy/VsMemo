import * as vscode from 'vscode';

export async function showBacklinks(): Promise<void> {
  // This command will toggle the backlinks view visibility
  await vscode.commands.executeCommand('backlinkView.focus');
}