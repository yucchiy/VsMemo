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
      return config;
    } catch (error) {
      console.warn('Failed to load memo config, using default:', error);
      return this.getDefaultConfig();
    }
  }

  private getWorkspaceRoot(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return workspaceFolders?.[0]?.uri.fsPath;
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