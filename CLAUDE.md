# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VsMemo is a VS Code extension for memo management with template system. The extension allows users to create Markdown memos using configurable types and templates with variable substitution.

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
│   ├── MemoType.ts
│   ├── MemoConfig.ts
│   └── Template.ts
├── services/
│   ├── interfaces/      # Service contracts
│   │   ├── IConfigService.ts
│   │   ├── IFileService.ts
│   │   └── ITemplateService.ts
│   └── implementations/ # Service implementations
│       ├── VsCodeConfigService.ts
│       ├── VsCodeFileService.ts
│       └── TemplateService.ts
├── usecases/            # Application logic
│   └── CreateMemoUseCase.ts
├── commands/            # VS Code commands
│   └── createMemo.ts
├── utils/               # Utility functions
│   ├── dateUtils.ts
│   └── pathUtils.ts
├── extension.ts         # Extension entry point
└── test/               # Test suites
    ├── utils/
    ├── services/
    ├── usecases/
    └── commands/
```

Key files:
- `package.json` - Extension manifest defining commands and metadata
- `out/` - Compiled JavaScript output (excluded by .gitignore)
- `node_modules/` - Dependencies (excluded by .gitignore)
- `package-lock.json` - Dependency lock file (excluded by .gitignore)

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

- **Memo Creation**: Template-based memo generation with variable substitution
- **Configuration**: `.vsmemo/types.json` defines memo types and templates
- **Templates**: Support for `{YEAR}`, `{MONTH}`, `{DAY}`, `{DATE}`, `{TITLE}` variables
- **File Management**: Automatic directory creation, existing file detection

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
- **Utilities** (dateUtils, pathUtils) - 11 tests
- **Services** (TemplateService) - 7 tests  
- **Use Cases** (CreateMemoUseCase) - 3 tests
- **Total**: 21 tests passing

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

- Dependencies are managed via npm and excluded from version control
- Run `npm install` after cloning to install dependencies
- `package-lock.json` is excluded to avoid unnecessary version conflicts
- Only commit `package.json` for dependency management