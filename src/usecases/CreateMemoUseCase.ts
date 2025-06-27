import * as vscode from 'vscode';
import * as path from 'path';
import { IConfigService } from '../services/interfaces/IConfigService';
import { IFileService } from '../services/interfaces/IFileService';
import { ITemplateService } from '../services/interfaces/ITemplateService';
import { MemoType } from '../models/MemoType';

export interface IWorkspaceService {
  getWorkspaceRoot(): string | undefined;
  showQuickPick<T extends vscode.QuickPickItem>(items: readonly T[], options?: vscode.QuickPickOptions): Promise<T | undefined>;
  showInputBox(options?: vscode.InputBoxOptions): Promise<string | undefined>;
  showErrorMessage(message: string): void;
}

export class VsCodeWorkspaceService implements IWorkspaceService {
  getWorkspaceRoot(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return workspaceFolders?.[0]?.uri.fsPath;
  }

  async showQuickPick<T extends vscode.QuickPickItem>(items: readonly T[], options?: vscode.QuickPickOptions): Promise<T | undefined> {
    return await vscode.window.showQuickPick(items, options);
  }

  async showInputBox(options?: vscode.InputBoxOptions): Promise<string | undefined> {
    return await vscode.window.showInputBox(options);
  }

  showErrorMessage(message: string): void {
    vscode.window.showErrorMessage(message);
  }
}

export class CreateMemoUseCase {
  constructor(
    private configService: IConfigService,
    private fileService: IFileService,
    private templateService: ITemplateService,
    private workspaceService: IWorkspaceService
  ) {}

  async execute(memoTypeName?: string, title?: string): Promise<void> {
    const config = await this.configService.loadConfig();

    let memoType: MemoType;
    if (memoTypeName) {
      const foundType = config.memoTypes.find(type => type.name === memoTypeName);
      if (!foundType) {
        throw new Error(`Memo type "${memoTypeName}" not found`);
      }
      memoType = foundType;
    } else {
      memoType = await this.selectMemoType(config.memoTypes);
    }

    if (!title) {
      title = await this.promptForTitle();
      if (!title) {
        return;
      }
    }

    const variables = this.templateService.createTemplateVariables(title);
    const workspaceRoot = this.workspaceService.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.workspaceService.showErrorMessage('No workspace folder is open');
      return;
    }

    const configBasePath = path.join(workspaceRoot, '.vsmemo');
    const processedTemplate = await this.templateService.processTemplateFromFile(memoType.template, configBasePath, variables);

    let fullPath: string;
    if (processedTemplate.filePath) {
      fullPath = path.join(workspaceRoot, processedTemplate.filePath);
    } else {
      const fileName = `${variables.TITLE}.md`;
      fullPath = path.join(workspaceRoot, config.defaultOutputDir, fileName);
    }

    const fileExists = await this.fileService.exists(fullPath);

    if (!fileExists) {
      const dirPath = path.dirname(fullPath);
      if (!(await this.fileService.exists(dirPath))) {
        await this.fileService.createDirectory(dirPath);
      }

      let content = processedTemplate.content;
      if (processedTemplate.frontmatter) {
        const frontmatterString = Object.entries(processedTemplate.frontmatter)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        content = `---\n${frontmatterString}\n---\n\n${content}`;
      }

      await this.fileService.writeFile(fullPath, content);
    }

    await this.fileService.openFile(fullPath);
  }

  private async selectMemoType(memoTypes: MemoType[]): Promise<MemoType> {
    const items = memoTypes.map(type => ({
      label: type.name,
      memoType: type
    }));

    const selected = await this.workspaceService.showQuickPick(items, {
      placeHolder: 'Select memo type'
    });

    if (!selected) {
      throw new Error('No memo type selected');
    }

    return selected.memoType;
  }

  private async promptForTitle(): Promise<string | undefined> {
    return await this.workspaceService.showInputBox({
      prompt: 'Enter memo title',
      placeHolder: 'My memo title'
    });
  }
}