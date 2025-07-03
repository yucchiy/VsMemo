import { ITemplateService } from '../interfaces/ITemplateService';
import { IFileService } from '../interfaces/IFileService';
import { Template } from '../../models/Template';
import { VariableRegistry } from '../../variables/VariableRegistry';
import { VariableContext } from '../../variables/IVariable';
import { extractVariableNames } from '../../utils/variableUtils';
import { IWorkspaceService } from '../../usecases/CreateMemoUseCase';
import * as path from 'path';

export class TemplateService implements ITemplateService {
  constructor(private fileService: IFileService, private workspaceService: IWorkspaceService) {}

  async processTemplateFromFile(templateFilePath: string, configBasePath: string, registry: VariableRegistry, presetInputs?: Record<string, string>): Promise<Template> {
    const fullTemplatePath = path.resolve(configBasePath, templateFilePath);
    const templateContent = await this.fileService.readFile(fullTemplatePath);

    // Extract variables used in the template
    const usedVariableNames = extractVariableNames(templateContent);

    // Create context for variable resolution
    const context: VariableContext = {
      date: new Date(),
      userInputs: presetInputs || {},
      workspaceService: this.workspaceService
    };

    // Resolve only used variables
    const resolvedVariables = await registry.resolveUsedVariables(usedVariableNames, context);

    return this.processTemplate(templateContent, resolvedVariables);
  }

  private processTemplate(templateContent: string, variables: Record<string, string>): Template {
    const lines = templateContent.split('\n');
    let frontmatter: Record<string, any> | undefined;
    let content = templateContent;
    let path = '';
    let baseDir: string | undefined;

    if (lines[0] === '---') {
      const frontmatterEndIndex = lines.slice(1).findIndex(line => line === '---');
      if (frontmatterEndIndex !== -1) {
        const frontmatterLines = lines.slice(1, frontmatterEndIndex + 1);
        const contentLines = lines.slice(frontmatterEndIndex + 2);

        frontmatter = this.parseFrontmatter(frontmatterLines);
        content = contentLines.join('\n').replace(/^\n+/, '');

        if (frontmatter.path) {
          path = this.replaceVariables(frontmatter.path, variables);
          delete frontmatter.path;
        }

        if (frontmatter.baseDir) {
          baseDir = this.replaceVariables(frontmatter.baseDir, variables);
          delete frontmatter.baseDir;
        }
      }
    }

    content = this.replaceVariables(content, variables);

    if (frontmatter) {
      frontmatter = this.replaceVariablesInObject(frontmatter, variables);
    }

    return {
      frontmatter,
      content,
      path,
      baseDir
    };
  }

  private parseFrontmatter(lines: string[]): Record<string, any> {
    const frontmatter: Record<string, any> = {};

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim();
        let value: any = line.substring(colonIndex + 1).trim();

        // Parse arrays (simple format: [item1, item2])
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value
            .slice(1, -1)
            .split(',')
            .map((item: string) => item.trim())
            .filter((item: string) => item.length > 0);
        }
        // Parse booleans
        else if (value === 'true') {
          value = true;
        }
        else if (value === 'false') {
          value = false;
        }
        // Parse numbers
        else if (/^\d+$/.test(value)) {
          value = parseInt(value, 10);
        }
        else if (/^\d+\.\d+$/.test(value)) {
          value = parseFloat(value);
        }

        frontmatter[key] = value;
      }
    }

    return frontmatter;
  }

  private replaceVariables(text: string, variables: Record<string, string>): string {
    let result = text;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  private replaceVariablesInObject(obj: Record<string, any>, variables: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.replaceVariables(value, variables);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}