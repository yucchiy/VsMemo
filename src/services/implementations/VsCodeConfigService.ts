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
      const config = JSON.parse(configContent) as MemoConfig;
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

  private validateAndFixConfig(config: any): MemoConfig {
    if (!config || typeof config !== 'object') {
      console.warn('Invalid config format, using default config');
      return this.getDefaultConfig();
    }

    if (!Array.isArray(config.memoTypes)) {
      console.warn('memoTypes is not an array, using default config');
      return this.getDefaultConfig();
    }

    if (config.memoTypes.length === 0) {
      console.warn('memoTypes is empty, using default config');
      return this.getDefaultConfig();
    }

    for (const memoType of config.memoTypes) {
      if (!memoType || typeof memoType !== 'object') {
        console.warn('Invalid memo type object, using default config');
        return this.getDefaultConfig();
      }
      if (!memoType.name || typeof memoType.name !== 'string') {
        console.warn('Memo type missing name property, using default config');
        return this.getDefaultConfig();
      }
      if (!memoType.template || typeof memoType.template !== 'string') {
        console.warn('Memo type missing template property, using default config');
        return this.getDefaultConfig();
      }
    }

    if (!config.defaultOutputDir || typeof config.defaultOutputDir !== 'string') {
      console.warn('defaultOutputDir missing or invalid, using default value');
      config.defaultOutputDir = 'memos';
    }

    return config as MemoConfig;
  }

  private getDefaultConfig(): MemoConfig {
    return {
      memoTypes: [
        {
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
      defaultOutputDir: 'memos'
    };
  }
}