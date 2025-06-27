export interface Template {
  frontmatter?: Record<string, any>;
  content: string;
  filePath: string;
}

export interface TemplateVariables {
  YEAR: string;
  MONTH: string;
  DAY: string;
  DATE: string;
  TITLE: string;
}