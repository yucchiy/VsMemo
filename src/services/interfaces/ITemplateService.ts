import { Template } from '../../models/Template';
import { VariableRegistry } from '../../variables/VariableRegistry';

export interface ITemplateService {
  processTemplateFromFile(templateFilePath: string, configBasePath: string, registry: VariableRegistry, presetInputs?: Record<string, string>): Promise<Template>;
}