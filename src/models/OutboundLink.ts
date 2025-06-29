export interface OutboundLink {
  targetFile: string;
  linkText: string;
  sourceLine: number;
  context: string;
}

export interface OutboundLinkIndex {
  [sourceFile: string]: OutboundLink[];
}