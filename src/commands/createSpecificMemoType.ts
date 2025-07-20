import { CreateMemoUseCase, VsCodeWorkspaceService } from '../usecases/CreateMemoUseCase';
import { VsCodeConfigService } from '../services/implementations/VsCodeConfigService';
import { VsCodeFileService } from '../services/implementations/VsCodeFileService';
import { TemplateService } from '../services/implementations/TemplateService';
import { MetadataService } from '../services/implementations/MetadataService';

/**
 * Creates a memo of a specific type by name
 * @param memoTypeName The name of the memo type to create
 */
export async function createSpecificMemoType(memoTypeName: string): Promise<void> {
  try {
    const fileService = new VsCodeFileService();
    const configService = new VsCodeConfigService(fileService);
    const workspaceService = new VsCodeWorkspaceService();
    const templateService = new TemplateService(fileService, workspaceService);
    const metadataService = new MetadataService();

    const useCase = new CreateMemoUseCase(configService, fileService, templateService, workspaceService, metadataService);

    // Execute with the specific memo type name, skipping type selection
    await useCase.execute(memoTypeName);
  } catch (error) {
    console.error(`Error creating memo of type '${memoTypeName}':`, error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    const vscode = await import('vscode');
    vscode.window.showErrorMessage(`Failed to create ${memoTypeName}: ${message}`);
  }
}

/**
 * Creates a command function for a specific memo type
 * @param memoTypeName The name of the memo type
 * @returns A command function that creates a memo of the specified type
 */
export function createMemoTypeCommand(memoTypeName: string): () => Promise<void> {
  return async () => {
    await createSpecificMemoType(memoTypeName);
  };
}