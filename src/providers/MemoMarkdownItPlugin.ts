import * as vscode from 'vscode';
import * as path from 'path';

export class MemoMarkdownPreviewProvider {
  constructor() {}

  public extendMarkdownIt(md: any) {
    return md.use(this.memoLinkPlugin.bind(this));
  }

  private memoLinkPlugin(md: any) {
    // Override link rendering to handle vsmemo:// links
    const defaultLinkRenderer = md.renderer.rules.link_open || function(tokens: any, idx: any, options: any, env: any, renderer: any) {
      return renderer.renderToken(tokens, idx, options);
    };

    md.renderer.rules.link_open = (tokens: any, idx: any, options: any, env: any, renderer: any) => {
      const token = tokens[idx];
      const hrefIndex = token.attrIndex('href');

      if (hrefIndex >= 0) {
        const href = token.attrs[hrefIndex][1];

        if (href.startsWith('vsmemo://')) {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (workspaceFolders && workspaceFolders.length > 0) {
            try {
              const memoUri = href.replace('vsmemo://', '');

              // Decode each path component individually to preserve forward slashes
              const pathParts = memoUri.split('/');
              const decodedParts = pathParts.map((part: string) => decodeURIComponent(part));
              const decodedUri = decodedParts.join('/');

              // Create a command URI that will be handled by our extension
              const commandUri = `command:vsmemo.openMemoFromPreview?${encodeURIComponent(JSON.stringify({ memoUri: decodedUri }))}`;
              token.attrs[hrefIndex][1] = commandUri;

              // Add styling and tooltip
              token.attrSet('class', 'vsmemo-link');
              token.attrSet('title', `Open memo: ${decodedUri}`);
              token.attrSet('style', 'color: #0066cc; text-decoration: underline;');
            } catch (error) {
              console.warn('Error processing vsmemo link in preview:', error);
            }
          }
        }
      }

      return defaultLinkRenderer(tokens, idx, options, env, renderer);
    };
  }
}