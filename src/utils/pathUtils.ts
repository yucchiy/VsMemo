import * as path from 'path';

export function normalizePath(inputPath: string): string {
  return path.normalize(inputPath.replace(/\\/g, '/'));
}

export function joinPaths(...paths: string[]): string {
  return normalizePath(path.join(...paths));
}

/**
 * ファイル間の相対パスを計算する
 * fromFile から toFile への相対パスを返す
 * 結果は常にフォワードスラッシュを使用
 */
export function calculateRelativePath(fromFile: string, toFile: string): string {
  const fromDir = path.dirname(fromFile);
  const relativePath = path.relative(fromDir, toFile);

  // Windows のバックスラッシュをフォワードスラッシュに変換
  let normalizedPath = relativePath.replace(/\\/g, '/');

  // 同じディレクトリまたはサブディレクトリの場合、./ を付ける
  if (!normalizedPath.startsWith('.') && !normalizedPath.startsWith('/')) {
    normalizedPath = './' + normalizedPath;
  }

  return normalizedPath;
}

/**
 * 基準ファイルからの相対パスを絶対パスに解決する
 */
export function resolveRelativePath(baseFile: string, relativePath: string): string {
  const baseDir = path.dirname(baseFile);
  const resolvedPath = path.resolve(baseDir, relativePath);
  return normalizePath(resolvedPath);
}