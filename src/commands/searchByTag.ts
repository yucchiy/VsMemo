import * as vscode from 'vscode';
import { SearchMemosUseCase } from '../usecases/SearchMemosUseCase';
import { VsCodeConfigService } from '../services/implementations/VsCodeConfigService';
import { VsCodeFileService } from '../services/implementations/VsCodeFileService';
import { TagIndexService } from '../services/implementations/TagIndexService';
import { MetadataService } from '../services/implementations/MetadataService';
import { VsCodeWorkspaceService } from '../usecases/CreateMemoUseCase';

export async function searchByTag(tag?: string): Promise<void> {
  try {
    const fileService = new VsCodeFileService();
    const configService = new VsCodeConfigService(fileService);
    const metadataService = new MetadataService();
    const workspaceService = new VsCodeWorkspaceService();

    const workspaceFolders = vscode.workspace.workspaceFolders;
    const workspaceRoot = workspaceFolders && workspaceFolders.length > 0
      ? workspaceFolders[0].uri.fsPath
      : '';

    const tagIndexService = new TagIndexService(fileService, configService, metadataService, workspaceRoot);

    const useCase = new SearchMemosUseCase(
      configService,
      fileService,
      tagIndexService,
      workspaceService
    );

    await useCase.execute(tag);
  } catch (error) {
    console.error('Error searching memos by tag:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to search memos by tag: ${message}`);
  }
}