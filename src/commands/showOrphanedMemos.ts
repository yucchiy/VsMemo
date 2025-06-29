import { MemoInsightsView } from '../views/BacklinkView';

export async function showOrphanedMemos(backlinkView: MemoInsightsView): Promise<void> {
  await backlinkView.showOrphanedFiles();
}