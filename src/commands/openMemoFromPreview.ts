import * as vscode from 'vscode';
import * as path from 'path';
import { VsCodeConfigService } from '../services/implementations/VsCodeConfigService';
import { VsCodeFileService } from '../services/implementations/VsCodeFileService';

export async function openMemoFromPreview(args: { memoUri: string }): Promise<void> {
  try {
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
      const fullPath = path.join(workspaceRoot, config.baseDir, args.memoUri);

      // Check if file exists
      if (await fileService.exists(fullPath)) {
        // Open the memo file
        const document = await vscode.workspace.openTextDocument(fullPath);
        await vscode.window.showTextDocument(document);
      } else {
        // Ask user if they want to create the file
        const createFile = await vscode.window.showInformationMessage(
          `Memo file "${args.memoUri}" does not exist. Would you like to create it?`,
          'Create',
          'Cancel'
        );

        if (createFile === 'Create') {
          // Create the directory if it doesn't exist
          const dirPath = path.dirname(fullPath);
          try {
            await fileService.createDirectory(dirPath);
          } catch (error) {
            // Directory might already exist, ignore error
          }

          // Create the file with basic content
          const fileName = path.basename(fullPath, path.extname(fullPath));
          const content = `# ${fileName}\n\n`;
          await fileService.writeFile(fullPath, content);

          // Open the created file
          const document = await vscode.workspace.openTextDocument(fullPath);
          await vscode.window.showTextDocument(document);
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
      vscode.window.showErrorMessage('Failed to load VsMemo configuration.');
    }
  } catch (error) {
    console.error('Error opening memo from preview:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to open memo: ${message}`);
  }
}