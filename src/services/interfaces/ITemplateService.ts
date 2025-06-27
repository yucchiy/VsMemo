import { Template, TemplateVariables } from '../../models/Template';

export interface ITemplateService {
  processTemplate(templateContent: string, variables: TemplateVariables): Template;
  createTemplateVariables(title?: string): TemplateVariables;
}