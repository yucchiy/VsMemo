import { BacklinkView } from '../views/BacklinkView';

export async function showOrphanedMemos(backlinkView: BacklinkView): Promise<void> {
  await backlinkView.showOrphanedFiles();
}