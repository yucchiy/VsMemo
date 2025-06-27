import { Template, TemplateVariables } from '../../models/Template';

export interface ITemplateService {
  processTemplateFromFile(templateFilePath: string, configBasePath: string, variables: TemplateVariables): Promise<Template>;
  createTemplateVariables(title?: string): TemplateVariables;
}