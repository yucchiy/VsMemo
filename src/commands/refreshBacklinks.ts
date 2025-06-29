import * as vscode from 'vscode';
import { MemoInsightsView } from '../views/BacklinkView';

export async function refreshBacklinks(backlinkView: MemoInsightsView): Promise<void> {
  await backlinkView.refresh();
  vscode.window.showInformationMessage('Backlink index refreshed');
}