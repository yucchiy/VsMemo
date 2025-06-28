import * as path from 'path';

export function isValidMemoFile(fileName: string, extensions: string[]): boolean {
  return extensions.some(ext => fileName.endsWith(ext));
}

export function extractFileNameWithoutExtension(fileName: string, extensions: string[]): string {
  for (const ext of extensions) {
    if (fileName.endsWith(ext)) {
      return path.basename(fileName, ext);
    }
  }
  return path.basename(fileName);
}