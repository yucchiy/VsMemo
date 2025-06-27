import { CreateMemoUseCase, VsCodeWorkspaceService } from '../usecases/CreateMemoUseCase';
import { VsCodeConfigService } from '../services/implementations/VsCodeConfigService';
import { VsCodeFileService } from '../services/implementations/VsCodeFileService';
import { TemplateService } from '../services/implementations/TemplateService';

export async function createMemo(): Promise<void> {
  try {
    const fileService = new VsCodeFileService();
    const configService = new VsCodeConfigService(fileService);
    const workspaceService = new VsCodeWorkspaceService();
    const templateService = new TemplateService(fileService, workspaceService);

    const useCase = new CreateMemoUseCase(configService, fileService, templateService, workspaceService);
    await useCase.execute();
  } catch (error) {
    console.error('Error creating memo:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    const vscode = await import('vscode');
    vscode.window.showErrorMessage(`Failed to create memo: ${message}`);
  }
}