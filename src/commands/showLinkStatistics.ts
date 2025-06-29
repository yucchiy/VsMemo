import { BacklinkView } from '../views/BacklinkView';

export async function showLinkStatistics(backlinkView: BacklinkView): Promise<void> {
  await backlinkView.showLinkStatistics();
}