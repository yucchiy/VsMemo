import * as vscode from 'vscode';
import { BacklinkView } from '../views/BacklinkView';

export async function refreshBacklinks(backlinkView: BacklinkView): Promise<void> {
  await backlinkView.refresh();
  vscode.window.showInformationMessage('Backlink index refreshed');
}