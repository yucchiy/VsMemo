
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

        // Check if this is a relative path link to a .md/.markdown file (not http/https)
        if ((href.endsWith('.md') || href.endsWith('.markdown')) && !href.startsWith('http://') && !href.startsWith('https://')) {
          try {
            // Add styling and tooltip for memo links
            token.attrSet('class', 'vsmemo-link');
            token.attrSet('title', `Open memo: ${href}`);
            token.attrSet('style', 'color: #0066cc; text-decoration: underline;');
          } catch (error) {
            console.warn('Error processing memo link in preview:', error);
          }
        }
      }

      return defaultLinkRenderer(tokens, idx, options, env, renderer);
    };
  }
}