# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VsMemo is a comprehensive VS Code extension for memo management with advanced linking and visualization capabilities. The extension provides:

- **Template-based memo creation** with variable substitution
- **Cross-memo linking** with custom `vsmemo://` URI scheme
- **Backlink tracking** and orphaned file detection
- **Interactive graph visualization** of memo relationships
- **Explorer integration** with rename/delete operations
- **Markdown preview support** for custom links
- **IntelliSense completion** for memo paths

## Development Commands

- `npm install` - Install dependencies
- `npm run compile` - Compile TypeScript to JavaScript output in `out/` directory
- `npm run watch` - Watch for changes and recompile automatically
- `npm run lint` - Run ESLint on the source code
- `npm run test` - Run the extension tests (includes compile and lint steps)
- `npm run vscode:prepublish` - Prepare for publishing (runs compile)

## Project Structure

```
src/
├── models/              # Core data structures
│   ├── MemoType.ts      # Memo type definitions
│   ├── MemoConfig.ts    # Configuration model
│   ├── Template.ts      # Template structure
│   └── Variable.ts      # Variable definitions
├── services/
│   ├── interfaces/      # Service contracts
│   │   ├── IConfigService.ts     # Configuration access
│   │   ├── IFileService.ts       # File operations
│   │   ├── ITemplateService.ts   # Template processing
│   │   ├── IGitService.ts        # Git operations
│   │   └── IBacklinkService.ts   # Backlink management
│   └── implementations/ # Service implementations
│       ├── VsCodeConfigService.ts
│       ├── VsCodeFileService.ts
│       ├── TemplateService.ts
│       ├── BacklinkService.ts
│       └── [Git services...]
├── providers/           # VS Code language providers
│   ├── MemoLinkProvider.ts           # Go-to-definition for vsmemo:// links
│   ├── MemoLinkCompletionProvider.ts # IntelliSense for memo paths
│   └── MemoMarkdownItPlugin.ts       # Markdown preview support
├── views/               # Custom VS Code views
│   ├── MemoTreeDataProvider.ts   # Explorer tree view
│   ├── BacklinkView.ts           # Backlink tree view
│   └── GraphView.ts              # Interactive graph visualization
├── commands/            # VS Code commands (13 commands)
│   ├── createMemo.ts, createMemoFromType.ts
│   ├── insertMemoLink.ts, openMemoFromPreview.ts
│   ├── renameMemo.ts, deleteMemo.ts
│   ├── showBacklinks.ts, refreshBacklinks.ts
│   ├── showOrphanedMemos.ts, showLinkStatistics.ts
│   ├── showGraph.ts
│   └── [others...]
├── usecases/            # Application logic
│   ├── CreateMemoUseCase.ts
│   └── ListMemosUseCase.ts
├── utils/               # Utility functions
│   ├── dateUtils.ts, pathUtils.ts
│   ├── fileUtils.ts, variableUtils.ts
├── variables/           # Variable system
│   ├── IVariable.ts, SystemVariable.ts
│   ├── UserDefinedVariable.ts
│   ├── VariableRegistry.ts
│   └── systemVariables.ts
├── events/              # Event system
│   └── MemoEvents.ts
├── extension.ts         # Extension entry point
└── test/               # Comprehensive test suites
    ├── utils/, services/, usecases/
    ├── commands/, variables/
    └── extension.test.ts
```

Key files and directories:
- `package.json` - Extension manifest (13 commands, 2 tree views, 3 dependencies)
- `media/` - Local graph visualization libraries (cytoscape.js)
- `out/` - Compiled JavaScript output (excluded by .gitignore)
- `node_modules/` - Dependencies (excluded by .gitignore)
- `.vsmemo/types.json` - User configuration file

## Architecture

### Design Principles

The extension follows a **layered architecture** with **dependency injection** for testability:

1. **Models**: Core data structures (`MemoType`, `MemoConfig`, `Template`)
2. **Services**: Business logic with interface-based contracts
   - Interfaces: `IConfigService`, `IFileService`, `ITemplateService`
   - Implementations: `VsCodeConfigService`, `VsCodeFileService`, `TemplateService`
3. **Use Cases**: Application logic (`CreateMemoUseCase`)
4. **Commands**: VS Code command handlers (`createMemo`)

### Dependency Injection

- Use **constructor injection** for services
- Avoid heavy DI containers - simple manual injection is preferred
- All services implement interfaces for easy testing
- Mock implementations for unit tests

### Core Features

#### 1. Memo Management
- **Template-based Creation**: Generate memos using configurable types and templates
- **Variable Substitution**: Support for system (`{YEAR}`, `{MONTH}`, `{DAY}`, `{DATE}`, `{TITLE}`) and user-defined variables
- **File Operations**: Rename, delete memo files via Explorer context menu
- **Configuration**: `.vsmemo/types.json` defines memo types, templates, and settings

#### 2. Cross-Memo Linking System
- **Custom URI Scheme**: `vsmemo://path/to/memo.md` for cross-references
- **Go-to-Definition**: Navigate to linked memos with VS Code's standard navigation
- **Hover Information**: Preview memo content on link hover
- **IntelliSense Completion**: Auto-complete memo paths in Markdown files
- **Markdown Preview Support**: Clickable links in preview mode
- **Link Insertion Command**: Interactive memo selection for link creation

#### 3. Backlink Analysis
- **Backlink Tracking**: Automatic indexing of all memo cross-references
- **Backlink View**: Tree view showing which files reference the current memo
- **Orphaned File Detection**: Find memos with no incoming links
- **Link Statistics**: Analytics on memo connectivity and relationships
- **Real-time Updates**: Dynamic updates on file save and edit

#### 4. Graph Visualization
- **Interactive Graph**: Cytoscape.js-powered visualization of memo relationships
- **Display Modes**: 
  - **Focus Mode**: Active file + directly connected memos
  - **Context Mode**: Active file + 2 degrees of separation
  - **Full Mode**: Complete memo network
- **Active File Tracking**: Graph automatically updates when switching files
- **Visual Highlighting**: Active file emphasized with orange border and larger size
- **Local Libraries**: Self-contained without CDN dependencies

#### 5. VS Code Integration
- **Explorer Views**: Two custom tree views (VsMemo, Backlinks)
- **Command Palette**: 13 commands for memo operations
- **Language Providers**: Definition, hover, and completion for Markdown files
- **Context Menus**: Right-click operations in Explorer
- **Markdown Extension**: Enhanced preview with custom link support

## TypeScript Configuration

- Target: ES2022
- Module: Node16
- Strict mode enabled
- Source maps generated for debugging
- Output directory: `out/`

## Testing

### Test Strategy

- **Comprehensive Coverage**: Cover all layers (utilities, services, use cases, commands)
- **Mock-Based Testing**: Use mock objects with dependency injection for isolated unit tests
- **VS Code Testing**: Tests use the VS Code test framework with Mocha (not Jest)
- **Test Organization**: Mirror source structure in test directory

### VS Code API Mocking Strategy

The main challenge in testing VS Code extensions is mocking the VS Code API. Our approach:

1. **Interface Abstraction**: Create interfaces for VS Code API dependencies
   - `IWorkspaceService` - Abstracts `vscode.workspace` and `vscode.window` APIs
   - `IFileService` - Abstracts file system operations
   - `IConfigService` - Abstracts configuration access

2. **Dependency Injection**: Inject service implementations through constructors
   ```typescript
   export class CreateMemoUseCase {
     constructor(
       private configService: IConfigService,
       private fileService: IFileService,
       private templateService: ITemplateService,
       private workspaceService: IWorkspaceService  // <- Injectable VS Code API wrapper
     ) {}
   }
   ```

3. **Mock Implementations**: Create test-specific mock services
   ```typescript
   class MockWorkspaceService implements IWorkspaceService {
     private workspaceRoot: string | undefined = '/test/workspace';
     private quickPickResult: any = undefined;
     
     getWorkspaceRoot(): string | undefined {
       return this.workspaceRoot;
     }
     
     setWorkspaceRoot(root: string | undefined): void {
       this.workspaceRoot = root;
     }
     // ... other mock methods
   }
   ```

### Test Patterns

```typescript
// Mock service pattern
class MockFileService implements IFileService {
  private files = new Map<string, string>();
  public openedFiles: string[] = [];
  
  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }
  
  getWrittenContent(path: string): string | undefined {
    return this.files.get(path);
  }
}

// Test setup with dependency injection
setup(() => {
  mockConfigService = new MockConfigService(testConfig);
  mockFileService = new MockFileService();
  mockTemplateService = new MockTemplateService();
  mockWorkspaceService = new MockWorkspaceService();
  
  useCase = new CreateMemoUseCase(
    mockConfigService,
    mockFileService, 
    mockTemplateService,
    mockWorkspaceService
  );
});

// Test verification
test('should create memo with specified type and title', async () => {
  await useCase.execute('Daily Note', 'Test Title');
  
  const expectedPath = '/test/workspace/memos/Test Title.md';
  const writtenContent = mockFileService.getWrittenContent(expectedPath);
  
  assert.ok(writtenContent);
  assert.ok(writtenContent.includes('title: Test Title'));
  assert.ok(mockFileService.openedFiles.includes(expectedPath));
});
```

### Test Coverage

Current test suite covers:
- **12 test files** across utilities, services, use cases, commands, and variables
- **Utilities**: dateUtils, pathUtils, fileUtils, variableUtils
- **Services**: TemplateService, VsCodeConfigService  
- **Use Cases**: CreateMemoUseCase, ListMemosUseCase
- **Variables**: SystemVariable, UserDefinedVariable, VariableRegistry
- **Integration**: extension.test.ts

Note: Advanced features like BacklinkService, GraphView, and providers would benefit from additional test coverage as the project scales.

### Running Tests

- `npm test` - Runs full test suite (compile + lint + test)
- Tests run in VS Code test environment with Mocha
- Compilation must succeed before tests run
- ESLint must pass before tests run

### Test Debugging Tips

1. **VS Code API Read-Only Properties**: Cannot mock `vscode.workspace.workspaceFolders` directly
   - Solution: Use `IWorkspaceService` abstraction layer
   
2. **Mocha vs Jest**: VS Code uses Mocha, not Jest
   - Use `assert` module, not `expect()`
   - Use `setup()`/`teardown()`, not `beforeEach()`/`afterEach()`
   
3. **Mock Verification**: Check both behavior and state
   - Verify method calls happened (behavior)
   - Verify correct data was written (state)

## Development Rules

### Git Workflow

This project follows a simplified gitflow approach:

#### Branch Strategy
- **main**: Production-ready code, stable releases
- **feature/xxx**: New feature development branches
- **fix/xxx**: Bug fix branches

#### Development Process
1. **Start Feature Development**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/feature-name
   ```

2. **During Development**:
   - Make commits with clean, descriptive messages (no Claude signatures)
   - Run tests frequently: `npm test`
   - Keep commits focused and atomic

3. **Complete Feature**:
   ```bash
   npm test                    # Ensure all tests pass
   git push origin feature/feature-name
   ```

4. **Integration**:
   - Create pull request from feature branch to main
   - Code review and merge via GitHub
   - Delete feature branch after merge

#### Claude Code Instructions
When asked to implement a feature:
1. **Always** create a feature branch first
2. Implement the feature with full test coverage
3. Ensure all tests pass and linting succeeds
4. Push the feature branch to origin
5. Do NOT merge to main directly - always use pull requests

### Commit Messages

**CRITICAL RULE - ALWAYS CHECK**: Never include Claude Code signatures in commit messages:
- ❌ Don't include: `🤖 Generated with [Claude Code]`
- ❌ Don't include: `Co-Authored-By: Claude <noreply@anthropic.com>`
- ✅ Use clean, descriptive commit messages focused on the change

**Before every commit**: Re-read this section to ensure compliance with project-specific rules.

### Code Standards

- **No Comments**: Don't add code comments unless explicitly requested
- **Interface-First**: Always define interfaces before implementations
- **Test-Driven**: Write tests for all new functionality
- **Clean Architecture**: Follow the established layered architecture pattern

### Dependencies

Current dependencies (3 runtime + dev dependencies):
- **cytoscape**: ^3.32.0 - Graph visualization library
- **cytoscape-cose-bilkent**: ^4.1.0 - Advanced graph layout algorithm
- **simple-git**: ^3.28.0 - Git operations for memo management

Development dependencies include TypeScript, ESLint, Mocha, and VS Code testing tools.

- Dependencies are managed via npm and excluded from version control
- Run `npm install` after cloning to install dependencies
- `package-lock.json` is excluded to avoid unnecessary version conflicts
- Only commit `package.json` for dependency management
- Local copies of graph libraries stored in `media/` for offline use

## Development Patterns and Conventions

### Implementation Approach

When implementing new features, follow this pattern:

1. **Service-First Design**: Start with interface definitions in `services/interfaces/`
2. **Provider Integration**: Use VS Code providers for language features
3. **View Components**: Create custom views for complex UI interactions
4. **Command Registration**: Add commands to `package.json` and register in `extension.ts`
5. **Testing**: Include comprehensive tests mirroring the source structure

### Feature Development Workflow

Based on the successful implementation of linking and graph features:

1. **Incremental Implementation**: Build features step-by-step with user feedback
2. **Debug-Friendly Development**: Include extensive logging for troubleshooting
3. **Real-time Updates**: Implement event-driven updates for responsive UI
4. **Error Handling**: Provide graceful fallbacks and user-friendly error messages
5. **Performance Considerations**: Use efficient algorithms for large memo collections

### VS Code Extension Patterns

- **WebView Usage**: For complex visualizations (GraphView with Cytoscape.js)
- **Tree Data Providers**: For hierarchical data display (Explorer views)
- **Language Providers**: For editor integrations (links, completion, hover)
- **Command Registration**: For user-accessible actions
- **Event Listeners**: For reactive behavior (file changes, active editor changes)

## Current Project Status

### Implemented Features (Complete)

✅ **Core Memo Management**
- Template-based memo creation with variable substitution
- Explorer tree view with type-based organization
- File operations (rename, delete) via context menu

✅ **Cross-Memo Linking System**
- Custom `vsmemo://` URI scheme with proper encoding
- Go-to-definition navigation
- Hover information with content preview
- IntelliSense completion for memo paths
- Markdown preview support for clickable links
- Interactive link insertion command

✅ **Backlink Analysis**
- Comprehensive backlink indexing and tracking
- Real-time backlink view with file grouping
- Orphaned file detection and listing
- Link statistics and analytics
- Automatic updates on file changes

✅ **Interactive Graph Visualization**
- Cytoscape.js-powered relationship graph
- Three display modes (Focus/Context/Full)
- Active file tracking with visual highlighting
- Local library loading (no CDN dependencies)
- Toolbar controls for mode switching
- Real-time updates on file navigation

### Technical Achievements

- **13 VS Code commands** registered and functional
- **2 custom tree views** (VsMemo Explorer, Backlinks)
- **3 language providers** (Definition, Hover, Completion)
- **Advanced WebView integration** with bidirectional messaging
- **Comprehensive service architecture** with dependency injection
- **Event-driven updates** throughout the application

### Development Approach Evolution

The project has evolved from a simple template-based memo creator to a comprehensive memo management system with advanced visualization capabilities. The development approach has successfully incorporated:

1. **User Feedback Integration**: Features refined based on real-time testing feedback
2. **Incremental Complexity**: Built complex features step-by-step
3. **Debug-First Development**: Extensive logging for troubleshooting
4. **Performance Awareness**: Efficient algorithms for large memo collections
5. **VS Code Best Practices**: Proper use of extension APIs and patterns

### Future Development Considerations

When adding new features, consider:
- **Testing Coverage**: Add tests for BacklinkService, GraphView, and providers
- **Performance Optimization**: Implement caching for large memo collections  
- **User Experience**: Add more customization options for graph visualization
- **Integration**: Consider additional export/import formats
- **Accessibility**: Ensure graph view works with screen readers