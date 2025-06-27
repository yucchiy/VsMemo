import * as path from 'path';

export function normalizePath(inputPath: string): string {
  return path.normalize(inputPath.replace(/\\/g, '/'));
}

export function joinPaths(...paths: string[]): string {
  return normalizePath(path.join(...paths));
}