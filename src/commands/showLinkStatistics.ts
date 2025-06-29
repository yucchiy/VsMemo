import { MemoInsightsView } from '../views/BacklinkView';

export async function showLinkStatistics(memoInsightsView: MemoInsightsView): Promise<void> {
  await memoInsightsView.showLinkStatistics();
}