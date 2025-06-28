import { MemoType } from './MemoType';
import { Variable } from './Variable';

export interface MemoConfig {
  memoTypes: MemoType[];
  baseDir: string;
  fileExtensions: string[];
  defaultExtension: string;
  variables?: Variable[];
}