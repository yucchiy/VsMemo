import { MemoConfig } from '../../models/MemoConfig';

export interface IConfigService {
  loadConfig(): Promise<MemoConfig>;
}