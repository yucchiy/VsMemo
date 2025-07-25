import * as vscode from 'vscode';
import * as path from 'path';
import { IConfigService } from '../interfaces/IConfigService';
import { IFileService } from '../interfaces/IFileService';
import { MemoConfig } from '../../models/MemoConfig';

export class VsCodeConfigService implements IConfigService {
  constructor(private fileService: IFileService) {}

  async loadConfig(): Promise<MemoConfig> {
    const workspaceFolder = this.getWorkspaceRoot();
    if (!workspaceFolder) {
      return this.getMinimalConfig();
    }

    const configPath = path.join(workspaceFolder, '.vsmemo', 'config.json');
    const oldConfigPath = path.join(workspaceFolder, '.vsmemo', 'types.json');

    // Check for migration from types.json to config.json
    if (!(await this.fileService.exists(configPath)) && await this.fileService.exists(oldConfigPath)) {
      await this.migrateConfig(oldConfigPath, configPath);
    }

    if (!(await this.fileService.exists(configPath))) {
      return this.getMinimalConfig();
    }

    try {
      const configContent = await this.fileService.readFile(configPath);
      const config: unknown = JSON.parse(configContent);
      return this.validateAndFixConfig(config);
    } catch (error) {
      console.warn('Failed to load memo config, using minimal config:', error);
      return this.getMinimalConfig();
    }
  }

  private async migrateConfig(oldPath: string, newPath: string): Promise<void> {
    try {
      const content = await this.fileService.readFile(oldPath);
      await this.fileService.writeFile(newPath, content);
      await this.fileService.deleteFile(oldPath);
      vscode.window.showInformationMessage('Migrated types.json to config.json successfully.');
    } catch (error) {
      console.error('Failed to migrate config file:', error);
      vscode.window.showErrorMessage('Failed to migrate types.json to config.json. Please rename manually.');
    }
  }

  protected getWorkspaceRoot(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return workspaceFolders?.[0]?.uri.fsPath;
  }

  private validateAndFixConfig(config: unknown): MemoConfig {
    if (!this.isObject(config)) {
      console.warn('Invalid config format, using minimal config');
      return this.getMinimalConfig();
    }

    // Allow missing or empty memoTypes - don't force defaults
    let memoTypes: any[] = [];
    if ('memoTypes' in config && Array.isArray(config.memoTypes)) {
      // Validate each memo type
      for (const memoType of config.memoTypes) {
        if (this.isValidMemoType(memoType)) {
          memoTypes.push(memoType);
        } else {
          console.warn('Invalid memo type object, skipping:', memoType);
        }
      }
    }

    const validatedConfig = config as {
      baseDir?: unknown;
      fileExtensions?: unknown;
      defaultExtension?: unknown;
      variables?: unknown;
    };

    // Set validated memoTypes
    const result: any = { memoTypes };

    if (!('baseDir' in validatedConfig) || typeof validatedConfig.baseDir !== 'string') {
      console.warn('baseDir missing or invalid, using default value');
      result.baseDir = '.';
    } else {
      result.baseDir = validatedConfig.baseDir;
    }

    if (!('fileExtensions' in validatedConfig) || !Array.isArray(validatedConfig.fileExtensions) ||
        !validatedConfig.fileExtensions.every(ext => typeof ext === 'string' && ext.startsWith('.'))) {
      console.warn('fileExtensions missing or invalid, using default value');
      result.fileExtensions = ['.md', '.markdown'];
    } else {
      result.fileExtensions = validatedConfig.fileExtensions;
    }

    if (!('defaultExtension' in validatedConfig) || typeof validatedConfig.defaultExtension !== 'string' ||
        !validatedConfig.defaultExtension.startsWith('.')) {
      console.warn('defaultExtension missing or invalid, using default value');
      result.defaultExtension = '.md';
    } else {
      result.defaultExtension = validatedConfig.defaultExtension;
    }

    // Validate and include variables if present
    if ('variables' in validatedConfig && Array.isArray(validatedConfig.variables)) {
      result.variables = validatedConfig.variables;
    }

    return result as MemoConfig;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
  }

  private isValidMemoType(memoType: unknown): memoType is { id: string; name: string; templatePath: string; baseDir?: string } {
    if (!this.isObject(memoType)) {
      return false;
    }

    if (!('id' in memoType) || typeof memoType.id !== 'string') {
      return false;
    }

    if (!('name' in memoType) || typeof memoType.name !== 'string') {
      return false;
    }

    if (!('templatePath' in memoType) || typeof memoType.templatePath !== 'string') {
      return false;
    }

    // baseDir is optional, but if present, must be a string
    if ('baseDir' in memoType && typeof memoType.baseDir !== 'string') {
      return false;
    }

    return true;
  }

  private getMinimalConfig(): MemoConfig {
    return {
      memoTypes: [],
      baseDir: '.',
      fileExtensions: ['.md', '.markdown'],
      defaultExtension: '.md'
    };
  }
}