import { ListMemosUseCase } from '../usecases/ListMemosUseCase';
import { VsCodeConfigService } from '../services/implementations/VsCodeConfigService';
import { VsCodeFileService } from '../services/implementations/VsCodeFileService';
import { VsCodeWorkspaceService } from '../usecases/CreateMemoUseCase';

export async function listMemos(): Promise<void> {
  try {
    const fileService = new VsCodeFileService();
    const configService = new VsCodeConfigService(fileService);
    const workspaceService = new VsCodeWorkspaceService();

    const useCase = new ListMemosUseCase(configService, fileService, workspaceService);
    await useCase.execute();
  } catch (error) {
    console.error('Error listing memos:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    const vscode = await import('vscode');
    vscode.window.showErrorMessage(`Failed to list memos: ${message}`);
  }
}