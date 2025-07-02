import { CreateMemoUseCase, VsCodeWorkspaceService } from '../usecases/CreateMemoUseCase';
import { VsCodeConfigService } from '../services/implementations/VsCodeConfigService';
import { VsCodeFileService } from '../services/implementations/VsCodeFileService';
import { TemplateService } from '../services/implementations/TemplateService';
import { MetadataService } from '../services/implementations/MetadataService';
import { MemoTreeItem } from '../views/MemoTreeDataProvider';

export async function createMemoFromType(treeItem: MemoTreeItem): Promise<void> {
  try {
    // Ensure we have a memo type
    if (!treeItem.memoType) {
      const vscode = await import('vscode');
      vscode.window.showErrorMessage('Invalid memo type selected.');
      return;
    }

    const fileService = new VsCodeFileService();
    const configService = new VsCodeConfigService(fileService);
    const workspaceService = new VsCodeWorkspaceService();
    const templateService = new TemplateService(fileService, workspaceService);
    const metadataService = new MetadataService();

    const useCase = new CreateMemoUseCase(configService, fileService, templateService, workspaceService, metadataService);

    // Execute with the specific memo type name, skipping type selection
    await useCase.execute(treeItem.memoType.name);
  } catch (error) {
    console.error('Error creating memo from type:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    const vscode = await import('vscode');
    vscode.window.showErrorMessage(`Failed to create memo: ${message}`);
  }
}