export interface Template {
  frontmatter?: Record<string, any>;
  content: string;
  path: string;
  baseDir?: string;
}

export interface TemplateVariables {
  YEAR: string;
  MONTH: string;
  DAY: string;
  DATE: string;
  DATETIME: string;
  TIME: string;
  TIMESTAMP: string;
  TITLE: string;
  [key: string]: string;
}