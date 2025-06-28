import * as vscode from 'vscode';

/**
 * Event emitter for memo-related events
 */
export class MemoEvents {
  private static instance: MemoEvents;
  private _onMemoCreated: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
  private _onMemoDeleted: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
  private _onMemoModified: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();

  public readonly onMemoCreated: vscode.Event<string> = this._onMemoCreated.event;
  public readonly onMemoDeleted: vscode.Event<string> = this._onMemoDeleted.event;
  public readonly onMemoModified: vscode.Event<string> = this._onMemoModified.event;

  public static getInstance(): MemoEvents {
    if (!MemoEvents.instance) {
      MemoEvents.instance = new MemoEvents();
    }
    return MemoEvents.instance;
  }

  public fireMemoCreated(filePath: string): void {
    this._onMemoCreated.fire(filePath);
  }

  public fireMemoDeleted(filePath: string): void {
    this._onMemoDeleted.fire(filePath);
  }

  public fireMemoModified(filePath: string): void {
    this._onMemoModified.fire(filePath);
  }

  public dispose(): void {
    this._onMemoCreated.dispose();
    this._onMemoDeleted.dispose();
    this._onMemoModified.dispose();
  }
}