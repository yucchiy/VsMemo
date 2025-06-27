import { Template } from '../../models/Template';
import { VariableRegistry } from '../../variables/VariableRegistry';

export interface ITemplateService {
  processTemplateFromFile(templateFilePath: string, configBasePath: string, registry: VariableRegistry, resolvedVariables: Record<string, string>): Promise<Template>;
  extractVariableNamesFromFile(templateFilePath: string, configBasePath: string): Promise<Set<string>>;
}