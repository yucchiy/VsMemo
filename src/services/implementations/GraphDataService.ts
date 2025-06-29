import * as path from 'path';
import { IBacklinkService } from '../interfaces/IBacklinkService';
import { IFileService } from '../interfaces/IFileService';
import { IConfigService } from '../interfaces/IConfigService';
import { isValidMemoFile } from '../../utils/fileUtils';

export interface GraphNode {
  id: string;
  label: string;
  size: number;
  color: string;
  title: string;
  isActive?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export enum GraphDisplayMode {
  FOCUS = 'focus',     // Only active file and directly connected
  CONTEXT = 'context', // Active file + 2 degrees of separation
  FULL = 'full'        // All files in workspace
}

export class GraphDataService {
  constructor(
    private backlinkService: IBacklinkService,
    private fileService: IFileService,
    private configService: IConfigService
  ) {}

  async generateGraphData(
    workspaceRoot: string,
    mode: GraphDisplayMode,
    activeFile?: string
  ): Promise<GraphData> {
    let allFiles: string[] = [];

    try {
      const config = await this.configService.loadConfig();
      const searchPath = path.join(workspaceRoot, config.baseDir);
      allFiles = await this.fileService.listFiles(searchPath, config.fileExtensions);
    } catch (error) {
      console.error('Error loading files for graph:', error);
      return { nodes: [], edges: [] };
    }

    let targetFiles: Set<string>;

    switch (mode) {
      case GraphDisplayMode.FOCUS:
        targetFiles = await this.getFocusFiles(activeFile, allFiles);
        break;
      case GraphDisplayMode.CONTEXT:
        targetFiles = await this.getContextFiles(activeFile, allFiles);
        break;
      case GraphDisplayMode.FULL:
      default:
        targetFiles = new Set(allFiles);
        break;
    }

    return this.buildGraphFromFiles(Array.from(targetFiles), activeFile);
  }

  private async getFocusFiles(activeFile: string | undefined, allFiles: string[]): Promise<Set<string>> {
    const files = new Set<string>();

    if (!activeFile) {
      return files;
    }

    files.add(activeFile);

    // Add directly connected files
    const backlinks = await this.backlinkService.getBacklinks(activeFile);
    const outboundLinks = await this.backlinkService.getOutboundLinks(activeFile);

    backlinks.forEach(link => files.add(link.sourceFile));
    outboundLinks.forEach(link => files.add(link.targetFile));

    return files;
  }

  private async getContextFiles(activeFile: string | undefined, allFiles: string[]): Promise<Set<string>> {
    const files = new Set<string>();

    if (!activeFile) {
      return new Set(allFiles);
    }

    // Start with focus files
    const focusFiles = await this.getFocusFiles(activeFile, allFiles);

    // Add second degree connections
    for (const file of focusFiles) {
      const backlinks = await this.backlinkService.getBacklinks(file);
      const outboundLinks = await this.backlinkService.getOutboundLinks(file);

      backlinks.forEach(link => files.add(link.sourceFile));
      outboundLinks.forEach(link => files.add(link.targetFile));
    }

    return files;
  }

  private async buildGraphFromFiles(files: string[], activeFile?: string): Promise<GraphData> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const addedEdges = new Set<string>();

    // Create nodes
    for (const filePath of files) {
      const fileName = path.basename(filePath, path.extname(filePath));
      const isActive = activeFile === filePath;

      // Calculate node size based on connections
      const backlinks = await this.backlinkService.getBacklinks(filePath);
      const outboundLinks = await this.backlinkService.getOutboundLinks(filePath);
      const connectionCount = backlinks.length + outboundLinks.length;

      const node: GraphNode = {
        id: filePath,
        label: fileName,
        size: Math.max(20, Math.min(50, 20 + connectionCount * 3)),
        color: isActive ? '#FF6B35' : '#4A90E2',
        title: `${fileName}\nBacklinks: ${backlinks.length}\nOutbound: ${outboundLinks.length}`,
        isActive
      };

      nodes.push(node);
    }

    // Create edges
    for (const filePath of files) {
      const outboundLinks = await this.backlinkService.getOutboundLinks(filePath);

      for (const link of outboundLinks) {
        if (files.includes(link.targetFile)) {
          const edgeId = `${filePath}->${link.targetFile}`;

          if (!addedEdges.has(edgeId)) {
            edges.push({
              id: edgeId,
              source: filePath,
              target: link.targetFile
            });
            addedEdges.add(edgeId);
          }
        }
      }
    }

    return { nodes, edges };
  }

  getNodeColor(isActive: boolean, connectionCount: number): string {
    if (isActive) {
      return '#FF6B35'; // Orange for active file
    }

    if (connectionCount > 5) {
      return '#2E8B57'; // Green for highly connected
    }

    if (connectionCount > 2) {
      return '#4A90E2'; // Blue for moderately connected
    }

    return '#87CEEB'; // Light blue for low connected
  }

  getNodeSize(connectionCount: number, isActive: boolean): number {
    const baseSize = 20;
    const maxSize = 50;
    const activeBonus = isActive ? 10 : 0;

    return Math.max(baseSize, Math.min(maxSize, baseSize + connectionCount * 3 + activeBonus));
  }
}