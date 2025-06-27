export function extractVariableNames(content: string): Set<string> {
  const variableNames = new Set<string>();
  const variablePattern = /\{([A-Z_][A-Z0-9_]*)\}/g;

  let match;
  while ((match = variablePattern.exec(content)) !== null) {
    variableNames.add(match[1]);
  }

  return variableNames;
}