export interface Template {
  frontmatter?: Record<string, any>;
  content: string;
  path: string;
}

export interface TemplateVariables {
  YEAR: string;
  MONTH: string;
  DAY: string;
  DATE: string;
  TITLE: string;
}