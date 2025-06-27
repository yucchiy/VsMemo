// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { createMemo } from './commands/createMemo';

export function activate(context: vscode.ExtensionContext) {
	console.log('VsMemo extension is now active!');

	const createMemoDisposable = vscode.commands.registerCommand('vsmemo.createMemo', createMemo);

	context.subscriptions.push(createMemoDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
