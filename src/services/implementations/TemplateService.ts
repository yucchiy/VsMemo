import { ITemplateService } from '../interfaces/ITemplateService';
import { IFileService } from '../interfaces/IFileService';
import { Template, TemplateVariables } from '../../models/Template';
import { getYear, getMonth, getDay, formatDate } from '../../utils/dateUtils';
import { joinPaths } from '../../utils/pathUtils';
import * as path from 'path';

export class TemplateService implements ITemplateService {
  constructor(private fileService: IFileService) {}

  async processTemplateFromFile(templateFilePath: string, configBasePath: string, variables: TemplateVariables): Promise<Template> {
    const fullTemplatePath = path.resolve(configBasePath, templateFilePath);
    const templateContent = await this.fileService.readFile(fullTemplatePath);
    return this.processTemplate(templateContent, variables);
  }

  private processTemplate(templateContent: string, variables: TemplateVariables): Template {
    const lines = templateContent.split('\n');
    let frontmatter: Record<string, any> | undefined;
    let content = templateContent;
    let filePath = '';

    if (lines[0] === '---') {
      const frontmatterEndIndex = lines.slice(1).findIndex(line => line === '---');
      if (frontmatterEndIndex !== -1) {
        const frontmatterLines = lines.slice(1, frontmatterEndIndex + 1);
        const contentLines = lines.slice(frontmatterEndIndex + 2);

        frontmatter = this.parseFrontmatter(frontmatterLines);
        content = contentLines.join('\n').replace(/^\n+/, '');

        if (frontmatter.filePath) {
          filePath = this.replaceVariables(frontmatter.filePath, variables);
          delete frontmatter.filePath;
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
      filePath
    };
  }

  createTemplateVariables(title?: string): TemplateVariables {
    const now = new Date();
    return {
      YEAR: getYear(now),
      MONTH: getMonth(now),
      DAY: getDay(now),
      DATE: formatDate(now),
      TITLE: title || `${getYear(now)}-${getMonth(now)}-${getDay(now)}`
    };
  }

  private parseFrontmatter(lines: string[]): Record<string, any> {
    const frontmatter: Record<string, any> = {};

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        frontmatter[key] = value;
      }
    }

    return frontmatter;
  }

  private replaceVariables(text: string, variables: TemplateVariables): string {
    let result = text;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  private replaceVariablesInObject(obj: Record<string, any>, variables: TemplateVariables): Record<string, any> {
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