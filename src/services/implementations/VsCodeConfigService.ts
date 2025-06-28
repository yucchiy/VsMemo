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
      return this.getDefaultConfig();
    }

    const configPath = path.join(workspaceFolder, '.vsmemo', 'types.json');

    if (!(await this.fileService.exists(configPath))) {
      return this.getDefaultConfig();
    }

    try {
      const configContent = await this.fileService.readFile(configPath);
      const config: unknown = JSON.parse(configContent);
      return this.validateAndFixConfig(config);
    } catch (error) {
      console.warn('Failed to load memo config, using default:', error);
      return this.getDefaultConfig();
    }
  }

  private getWorkspaceRoot(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return workspaceFolders?.[0]?.uri.fsPath;
  }

  private validateAndFixConfig(config: unknown): MemoConfig {
    if (!this.isObject(config)) {
      console.warn('Invalid config format, using default config');
      return this.getDefaultConfig();
    }

    if (!('memoTypes' in config) || !Array.isArray(config.memoTypes)) {
      console.warn('memoTypes is not an array, using default config');
      return this.getDefaultConfig();
    }

    if (config.memoTypes.length === 0) {
      console.warn('memoTypes is empty, using default config');
      return this.getDefaultConfig();
    }

    for (const memoType of config.memoTypes) {
      if (!this.isValidMemoType(memoType)) {
        console.warn('Invalid memo type object, using default config');
        return this.getDefaultConfig();
      }
    }

    const validatedConfig = config as {
      memoTypes: unknown[];
      baseDir?: unknown;
      fileExtensions?: unknown;
      defaultExtension?: unknown;
    };

    if (!('baseDir' in validatedConfig) || typeof validatedConfig.baseDir !== 'string') {
      console.warn('baseDir missing or invalid, using default value');
      validatedConfig.baseDir = '.';
    }

    if (!('fileExtensions' in validatedConfig) || !Array.isArray(validatedConfig.fileExtensions) ||
        !validatedConfig.fileExtensions.every(ext => typeof ext === 'string' && ext.startsWith('.'))) {
      console.warn('fileExtensions missing or invalid, using default value');
      validatedConfig.fileExtensions = ['.md', '.markdown'];
    }

    if (!('defaultExtension' in validatedConfig) || typeof validatedConfig.defaultExtension !== 'string' ||
        !validatedConfig.defaultExtension.startsWith('.')) {
      console.warn('defaultExtension missing or invalid, using default value');
      validatedConfig.defaultExtension = '.md';
    }

    return validatedConfig as MemoConfig;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
  }

  private isValidMemoType(memoType: unknown): memoType is { id: string; name: string; template: string } {
    if (!this.isObject(memoType)) {
      return false;
    }

    if (!('id' in memoType) || typeof memoType.id !== 'string') {
      return false;
    }

    if (!('name' in memoType) || typeof memoType.name !== 'string') {
      return false;
    }

    if (!('template' in memoType) || typeof memoType.template !== 'string') {
      return false;
    }

    return true;
  }

  private getDefaultConfig(): MemoConfig {
    return {
      memoTypes: [
        {
          id: 'daily',
          name: 'Daily Note',
          template: `---
title: {TITLE}
date: {DATE}
filePath: daily/{YEAR}/{MONTH}/{DAY}.md
---

# {TITLE}

## Tasks
- [ ] 

## Notes

`
        },
        {
          id: 'meeting',
          name: 'Meeting Note',
          template: `---
title: {TITLE}
date: {DATE}
type: meeting
filePath: meetings/{YEAR}/{MONTH}/{TITLE}.md
---

# {TITLE}

## Attendees
- 

## Agenda
- 

## Action Items
- [ ] 

`
        }
      ],
      baseDir: '.',
      fileExtensions: ['.md', '.markdown'],
      defaultExtension: '.md'
    };
  }
}