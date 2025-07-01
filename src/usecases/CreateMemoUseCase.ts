import * as vscode from 'vscode';
import * as path from 'path';
import { IConfigService } from '../services/interfaces/IConfigService';
import { IFileService } from '../services/interfaces/IFileService';
import { ITemplateService } from '../services/interfaces/ITemplateService';
import { MemoType } from '../models/MemoType';
import { VariableRegistry } from '../variables/VariableRegistry';
import { formatDate } from '../utils/dateUtils';
import { MemoEvents } from '../events/MemoEvents';

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

    const workspaceRoot = this.workspaceService.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.workspaceService.showErrorMessage('No workspace folder is open');
      return;
    }

    const configBasePath = path.join(workspaceRoot, '.vsmemo');

    // Create variable registry and register user-defined variables
    const registry = new VariableRegistry();
    if (config.variables) {
      registry.registerUserDefinedVariables(config.variables);
    }

    // Prepare preset inputs
    const presetInputs: Record<string, string> = {};
    if (title) {
      presetInputs['TITLE'] = title;
    }

    const processedTemplate = await this.templateService.processTemplateFromFile(memoType.templatePath, configBasePath, registry, presetInputs);

    let fullPath: string;
    const memoTypeBaseDir = memoType.baseDir || '.';
    const templateBaseDir = processedTemplate.baseDir || '.';

    if (processedTemplate.path) {
      // Template path is relative to config.baseDir + memoType.baseDir + template.baseDir
      fullPath = path.join(workspaceRoot, config.baseDir, memoTypeBaseDir, templateBaseDir, processedTemplate.path);
    } else {
      const fileName = title ? `${title}${config.defaultExtension}` : `${formatDate(new Date())}${config.defaultExtension}`;
      fullPath = path.join(workspaceRoot, config.baseDir, memoTypeBaseDir, templateBaseDir, fileName);
    }

    const fileExists = await this.fileService.exists(fullPath);

    if (!fileExists) {
      const dirPath = path.dirname(fullPath);
      if (!(await this.fileService.exists(dirPath))) {
        await this.fileService.createDirectory(dirPath);
      }

      let content = processedTemplate.content;

      // Add type to frontmatter
      const frontmatter = processedTemplate.frontmatter || {};
      frontmatter.type = memoType.id;

      const frontmatterString = Object.entries(frontmatter)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      content = `---\n${frontmatterString}\n---\n\n${content}`;

      await this.fileService.writeFile(fullPath, content);

      // Fire memo created event for tree view refresh
      const memoEvents = MemoEvents.getInstance();
      memoEvents.fireMemoCreated(fullPath);
    }

    await this.fileService.openFile(fullPath);
  }

  private async selectMemoType(memoTypes: MemoType[]): Promise<MemoType> {
    if (memoTypes.length === 0) {
      throw new Error('No memo types configured. Please create a .vsmemo/config.json file with memo type definitions.');
    }

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

}