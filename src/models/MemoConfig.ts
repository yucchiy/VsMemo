import { MemoType } from './MemoType';
import { Variable } from './Variable';

export interface MemoConfig {
  memoTypes: MemoType[];
  defaultOutputDir: string;
  variables?: Variable[];
}