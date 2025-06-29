import * as vscode from 'vscode';
import * as path from 'path';
import { IBacklinkService } from '../services/interfaces/IBacklinkService';
import { IFileService } from '../services/interfaces/IFileService';
import { IConfigService } from '../services/interfaces/IConfigService';
import { isValidMemoFile } from '../utils/fileUtils';

interface GraphNode {
  id: string;
  label: string;
  size: number;
  color: string;
  title: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class GraphView {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;
  private currentActiveFile: string | undefined;
  private displayMode: 'focus' | 'context' | 'full' = 'full';

  constructor(
    private backlinkService: IBacklinkService,
    private fileService: IFileService,
    private configService: IConfigService,
    context: vscode.ExtensionContext
  ) {
    this.context = context;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen to active editor changes
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor?.document.uri.scheme === 'file') {
        const filePath = editor.document.uri.fsPath;
        console.log('Active editor changed to:', filePath);
        if (await this.isValidMemoFile(filePath)) {
          console.log('Valid memo file detected, updating current active file');
          this.currentActiveFile = filePath;
          if (this.panel) {
            console.log('Panel exists, updating content. Display mode:', this.displayMode);
            await this.updateContent();
          }
        } else {
          console.log('Not a valid memo file');
        }
      }
    });

    // Update when files are saved (to catch new links)
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (document.uri.scheme === 'file' && this.panel) {
        await this.backlinkService.updateFileBacklinks(document.uri.fsPath);
        await this.updateContent();
      }
    });

    // Initialize with current active editor
    if (vscode.window.activeTextEditor?.document.uri.scheme === 'file') {
      const filePath = vscode.window.activeTextEditor.document.uri.fsPath;
      this.isValidMemoFile(filePath).then(isValid => {
        if (isValid) {
          this.currentActiveFile = filePath;
        }
      });
    }
  }

  private async isValidMemoFile(filePath: string): Promise<boolean> {
    const ext = filePath.toLowerCase();
    const isValidExtension = ext.endsWith('.md') || ext.endsWith('.markdown');

    if (!isValidExtension) {
      console.log('Invalid extension for file:', filePath);
      return false;
    }

    // Check if file is within workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      console.log('No workspace folders');
      return false;
    }

    try {
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const config = await this.configService.loadConfig();
      const baseDir = path.join(workspaceRoot, config.baseDir);

      const isInBaseDir = filePath.startsWith(baseDir);
      console.log('Checking file validity:', filePath);
      console.log('Base directory:', baseDir);
      console.log('Is in base directory:', isInBaseDir);

      return isInBaseDir;
    } catch (error) {
      console.warn('Error checking file validity:', error);
      return isValidExtension; // Fallback to extension check only
    }
  }

  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      await this.refresh(); // Refresh data when showing existing panel
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'memoGraph',
      'Memo Graph',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'media')
        ]
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'openFile':
          await this.openFile(message.filePath);
          break;
        case 'refresh':
          await this.refresh();
          break;
        case 'focusFile':
          await this.focusOnFile(message.filePath);
          break;
        case 'changeDisplayMode':
          this.displayMode = message.mode;
          await this.updateContent();
          break;
      }
    });

    await this.updateContent();
  }

  async refresh(): Promise<void> {
    if (this.panel) {
      await this.updateContent();
    }
  }

  private async updateContent(): Promise<void> {
    if (!this.panel) {return;}

    try {
      const graphData = await this.generateGraphData();
      console.log('Generated graph data:', graphData);
      console.log('Nodes:', graphData.nodes.length, 'Edges:', graphData.edges.length);
      console.log('Current active file:', this.currentActiveFile);

      this.panel.webview.html = this.getWebviewContent(graphData);

      // Notify webview about active file change after content is updated
      if (this.currentActiveFile) {
        setTimeout(() => {
          if (this.panel) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
              const workspaceRoot = workspaceFolders[0].uri.fsPath;
              const config = this.configService.loadConfig();
              config.then(cfg => {
                const nodeId = this.getNodeId(this.currentActiveFile!, workspaceRoot, cfg.baseDir);
                this.panel!.webview.postMessage({
                  command: 'highlightActiveFile',
                  nodeId: nodeId
                });
              });
            }
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error updating graph content:', error);
      vscode.window.showErrorMessage('Failed to generate graph view');
    }
  }

  private async generateGraphData(): Promise<GraphData> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return { nodes: [], edges: [] };
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const config = await this.configService.loadConfig();
    const baseDir = path.join(workspaceRoot, config.baseDir);

    // Collect all memo files
    const allFiles = new Set<string>();
    console.log('Searching for files in:', baseDir);
    console.log('File extensions:', config.fileExtensions);
    console.log('Display mode:', this.displayMode);
    console.log('Active file:', this.currentActiveFile);
    await this.collectAllFiles(baseDir, allFiles, config.fileExtensions);
    console.log('Found files:', Array.from(allFiles));

    // Filter files based on display mode
    const filteredFiles = this.filterFilesByDisplayMode(Array.from(allFiles), workspaceRoot, config.baseDir);

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeMap = new Map<string, number>(); // Track node connections for sizing

    // Create nodes for filtered files
    for (const filePath of filteredFiles) {
      const nodeId = this.getNodeId(filePath, workspaceRoot, config.baseDir);
      const fileName = path.basename(filePath, path.extname(filePath));

      nodeMap.set(nodeId, 0);

      nodes.push({
        id: nodeId,
        label: fileName,
        size: 20, // Will be updated based on connections
        color: '#4A90E2',
        title: path.relative(baseDir, filePath)
      });
    }

    // Create edges from backlink data (only for filtered files)
    for (const filePath of filteredFiles) {
      const backlinks = await this.backlinkService.getBacklinks(filePath);
      const targetNodeId = this.getNodeId(filePath, workspaceRoot, config.baseDir);

      for (const backlink of backlinks) {
        const sourceNodeId = this.getNodeId(backlink.sourceFile, workspaceRoot, config.baseDir);

        if (nodeMap.has(sourceNodeId) && nodeMap.has(targetNodeId)) {
          edges.push({
            id: `${sourceNodeId}-${targetNodeId}`,
            source: sourceNodeId,
            target: targetNodeId,
            label: backlink.linkText
          });

          // Increase connection count for both nodes
          nodeMap.set(sourceNodeId, (nodeMap.get(sourceNodeId) || 0) + 1);
          nodeMap.set(targetNodeId, (nodeMap.get(targetNodeId) || 0) + 1);
        }
      }
    }

    // Update node sizes based on connections and identify special nodes
    nodes.forEach(node => {
      const connections = nodeMap.get(node.id) || 0;
      node.size = Math.max(20, 20 + connections * 5); // Base size + connection bonus

      // Check if this is the active file
      const fullPath = this.getFullPathFromNodeId(node.id, workspaceRoot, config.baseDir);
      const isActiveFile = this.currentActiveFile && fullPath === this.currentActiveFile;

      if (isActiveFile) {
        node.color = '#FF9500'; // Orange for active file
        node.size = Math.max(30, node.size + 10); // Make active file larger
      } else if (connections === 0) {
        node.color = '#FF6B6B'; // Red for isolated nodes
      } else if (connections >= 5) {
        node.color = '#4ECDC4'; // Teal for highly connected nodes
      } else {
        node.color = '#4A90E2'; // Blue for normal nodes
      }
    });

    return { nodes, edges };
  }

  private async collectAllFiles(dir: string, files: Set<string>, fileExtensions: string[]): Promise<void> {
    try {
      if (!(await this.fileService.exists(dir))) {
        return;
      }

      const entries = await this.fileService.readDirectory(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stats = await this.fileService.getStats(fullPath);

        if (stats.isDirectory) {
          await this.collectAllFiles(fullPath, files, fileExtensions);
        } else if (isValidMemoFile(entry, fileExtensions)) {
          files.add(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Failed to collect files from ${dir}:`, error);
    }
  }

  private getNodeId(filePath: string, workspaceRoot: string, baseDir: string): string {
    // Create a unique node ID based on relative path
    const relativePath = path.relative(path.join(workspaceRoot, baseDir), filePath);
    return relativePath.replace(/\\/g, '/'); // Normalize path separators
  }

  private getFullPathFromNodeId(nodeId: string, workspaceRoot: string, baseDir: string): string {
    return path.join(workspaceRoot, baseDir, nodeId.replace(/\//g, path.sep));
  }

  private filterFilesByDisplayMode(allFiles: string[], workspaceRoot: string, baseDir: string): string[] {
    if (this.displayMode === 'full' || !this.currentActiveFile) {
      return allFiles;
    }

    const activeNodeId = this.getNodeId(this.currentActiveFile, workspaceRoot, baseDir);
    const relatedFiles = new Set<string>();
    relatedFiles.add(this.currentActiveFile);

    if (this.displayMode === 'focus') {
      // Focus mode: active file + directly connected files
      this.addDirectlyConnectedFiles(this.currentActiveFile, allFiles, relatedFiles);
    } else if (this.displayMode === 'context') {
      // Context mode: active file + 2 degrees of separation
      this.addDirectlyConnectedFiles(this.currentActiveFile, allFiles, relatedFiles);
      const firstDegreeFiles = Array.from(relatedFiles);
      firstDegreeFiles.forEach(file => {
        if (file !== this.currentActiveFile) {
          this.addDirectlyConnectedFiles(file, allFiles, relatedFiles);
        }
      });
    }

    return Array.from(relatedFiles);
  }

  private async addDirectlyConnectedFiles(filePath: string, allFiles: string[], relatedFiles: Set<string>): Promise<void> {
    try {
      // Get backlinks to this file
      const backlinks = await this.backlinkService.getBacklinks(filePath);
      backlinks.forEach(backlink => {
        if (allFiles.includes(backlink.sourceFile)) {
          relatedFiles.add(backlink.sourceFile);
        }
      });

      // Get links from this file (would require parsing the file content)
      // For now, we'll use the backlink service's reverse lookup
      for (const otherFile of allFiles) {
        if (otherFile !== filePath) {
          const otherBacklinks = await this.backlinkService.getBacklinks(otherFile);
          const hasLinkFromCurrent = otherBacklinks.some(bl => bl.sourceFile === filePath);
          if (hasLinkFromCurrent) {
            relatedFiles.add(otherFile);
          }
        }
      }
    } catch (error) {
      console.warn('Error finding connected files:', error);
    }
  }

  private async openFile(filePath: string): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {return;}

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const config = await this.configService.loadConfig();
      const fullPath = path.join(workspaceRoot, config.baseDir, filePath);

      if (await this.fileService.exists(fullPath)) {
        const document = await vscode.workspace.openTextDocument(fullPath);
        await vscode.window.showTextDocument(document);
      }
    } catch (error) {
      console.error('Error opening file from graph:', error);
      vscode.window.showErrorMessage(`Failed to open file: ${filePath}`);
    }
  }

  private async focusOnFile(filePath: string): Promise<void> {
    // This would highlight the node and its connections
    if (this.panel) {
      this.panel.webview.postMessage({
        command: 'focusNode',
        nodeId: filePath
      });
    }
  }

  private getWebviewContent(graphData: GraphData): string {
    const nonce = this.getNonce();

    // Get URIs for local resources
    const cytoscapeUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'cytoscape.min.js')
    );
    const coseBilkentUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'cytoscape-cose-bilkent.js')
    );

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Memo Graph</title>
        <script nonce="${nonce}" src="${cytoscapeUri}"></script>
        <script nonce="${nonce}" src="${coseBilkentUri}"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
            overflow: hidden;
          }
          
          .container {
            height: 100vh;
            display: flex;
            flex-direction: column;
          }
          
          .toolbar {
            background-color: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-sideBar-border);
            padding: 8px;
            display: flex;
            gap: 8px;
            align-items: center;
            flex-shrink: 0;
          }
          
          .toolbar button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 12px;
          }
          
          .toolbar button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          
          .toolbar .mode-btn {
            margin: 0 2px;
            position: relative;
          }
          
          .toolbar .mode-btn.active {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }
          
          .toolbar .info {
            margin-left: auto;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
          }
          
          #graph {
            flex: 1;
            background-color: var(--vscode-editor-background);
          }
          
          .node-tooltip {
            position: absolute;
            background-color: var(--vscode-editorHoverWidget-background);
            border: 1px solid var(--vscode-editorHoverWidget-border);
            border-radius: 4px;
            padding: 8px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
            max-width: 200px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="toolbar">
            <button onclick="refreshGraph()">Refresh</button>
            <button onclick="resetView()">Reset View</button>
            <button onclick="fitToContent()">Fit to Content</button>
            <span style="margin-left: 20px; margin-right: 8px; font-size: 12px;">View Mode:</span>
            <button id="focusBtn" onclick="changeDisplayMode('focus')" class="mode-btn">Focus</button>
            <button id="contextBtn" onclick="changeDisplayMode('context')" class="mode-btn">Context</button>
            <button id="fullBtn" onclick="changeDisplayMode('full')" class="mode-btn">Full</button>
            <div class="info">
              Nodes: ${graphData.nodes.length} | Edges: ${graphData.edges.length} | Mode: ${this.displayMode}
            </div>
          </div>
          <div id="graph"></div>
        </div>
        
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          let cy;
          
          const graphData = ${JSON.stringify(graphData)};
          console.log('Graph data in webview:', graphData);
          
          function initGraph() {
            console.log('Initializing graph...');
            console.log('Nodes:', graphData.nodes.length);
            console.log('Edges:', graphData.edges.length);
            
            if (typeof cytoscape === 'undefined') {
              document.getElementById('graph').innerHTML = '<div style="padding: 20px; text-align: center; color: var(--vscode-errorForeground);">Error: Cytoscape library not loaded. Please check your internet connection.</div>';
              return;
            }
            
            if (graphData.nodes.length === 0) {
              document.getElementById('graph').innerHTML = '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">No memo files found. Create some memos and links to see the graph.</div>';
              return;
            }
            
            try {
              cy = cytoscape({
              container: document.getElementById('graph'),
              
              elements: [
                ...graphData.nodes.map(node => ({
                  data: { 
                    id: node.id, 
                    label: node.label,
                    title: node.title
                  },
                  style: {
                    'background-color': node.color,
                    'width': node.size,
                    'height': node.size
                  }
                })),
                ...graphData.edges.map(edge => ({
                  data: { 
                    id: edge.id, 
                    source: edge.source, 
                    target: edge.target,
                    label: edge.label || ''
                  }
                }))
              ],
              
              style: [
                {
                  selector: 'node',
                  style: {
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': '12px',
                    'font-family': 'var(--vscode-font-family)',
                    'color': 'var(--vscode-editor-foreground)',
                    'text-wrap': 'wrap',
                    'text-max-width': '80px',
                    'border-width': 2,
                    'border-color': 'var(--vscode-focusBorder)',
                    'border-opacity': 0
                  }
                },
                {
                  selector: 'node:selected',
                  style: {
                    'border-opacity': 1,
                    'border-width': 3
                  }
                },
                {
                  selector: 'edge',
                  style: {
                    'width': 2,
                    'line-color': 'var(--vscode-editorLink-activeForeground)',
                    'target-arrow-color': 'var(--vscode-editorLink-activeForeground)',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'opacity': 0.7
                  }
                },
                {
                  selector: 'edge:selected',
                  style: {
                    'width': 3,
                    'opacity': 1
                  }
                },
                {
                  selector: 'node.active-file',
                  style: {
                    'border-width': 4,
                    'border-color': '#FF9500',
                    'border-opacity': 1
                  }
                }
              ],
              
              layout: typeof coseBilkent !== 'undefined' ? {
                name: 'cose-bilkent',
                quality: 'default',
                nodeDimensionsIncludeLabels: true,
                randomize: false,
                animate: 'during',
                animationDuration: 1000
              } : {
                name: 'grid',
                padding: 10,
                avoidOverlap: true,
                animate: 'during',
                animationDuration: 1000
              }
            });
            
            console.log('Graph initialized successfully');
            
            // Add event listeners
            cy.on('tap', 'node', function(evt) {
              const node = evt.target;
              const nodeId = node.id();
              vscode.postMessage({
                command: 'openFile',
                filePath: nodeId
              });
            });
            
            cy.on('mouseover', 'node', function(evt) {
              const node = evt.target;
              const data = node.data();
              showTooltip(evt.originalEvent, data.title || data.label);
            });
            
            cy.on('mouseout', 'node', function(evt) {
              hideTooltip();
            });
            } catch (error) {
              console.error('Error initializing graph:', error);
              document.getElementById('graph').innerHTML = '<div style="padding: 20px; text-align: center; color: var(--vscode-errorForeground);">Error initializing graph: ' + error.message + '</div>';
            }
          }
          
          function showTooltip(event, text) {
            const tooltip = document.createElement('div');
            tooltip.className = 'node-tooltip';
            tooltip.textContent = text;
            tooltip.style.left = event.clientX + 10 + 'px';
            tooltip.style.top = event.clientY - 30 + 'px';
            document.body.appendChild(tooltip);
          }
          
          function hideTooltip() {
            const tooltips = document.querySelectorAll('.node-tooltip');
            tooltips.forEach(tooltip => tooltip.remove());
          }
          
          function refreshGraph() {
            vscode.postMessage({ command: 'refresh' });
          }
          
          function resetView() {
            cy.fit();
            cy.center();
          }
          
          function fitToContent() {
            cy.fit();
          }
          
          function changeDisplayMode(mode) {
            vscode.postMessage({
              command: 'changeDisplayMode',
              mode: mode
            });
          }
          
          function updateModeButtons(activeMode) {
            // Remove active class from all mode buttons
            document.querySelectorAll('.mode-btn').forEach(btn => {
              btn.classList.remove('active');
            });
            
            // Add active class to current mode button
            const activeBtn = document.getElementById(activeMode + 'Btn');
            if (activeBtn) {
              activeBtn.classList.add('active');
            }
          }
          
          // Initialize graph when page loads
          window.addEventListener('load', () => {
            initGraph();
            updateModeButtons('${this.displayMode}');
          });
          document.addEventListener('DOMContentLoaded', () => {
            initGraph();
            updateModeButtons('${this.displayMode}');
          });
          
          // Fallback initialization after a delay
          setTimeout(() => {
            if (!cy) {
              console.log('Fallback initialization triggered');
              initGraph();
              updateModeButtons('${this.displayMode}');
            }
          }, 2000);
          
          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
              case 'focusNode':
                const node = cy.getElementById(message.nodeId);
                if (node.length > 0) {
                  cy.center(node);
                  node.select();
                }
                break;
              case 'highlightActiveFile':
                console.log('Received highlightActiveFile message for nodeId:', message.nodeId);
                if (cy) {
                  // Remove previous highlighting
                  cy.nodes().removeClass('active-file');
                  
                  // Add highlighting to current active file
                  const activeNode = cy.getElementById(message.nodeId);
                  if (activeNode.length > 0) {
                    activeNode.addClass('active-file');
                    console.log('Highlighted active file node:', message.nodeId);
                  } else {
                    console.log('Active file node not found in graph:', message.nodeId);
                  }
                }
                break;
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}