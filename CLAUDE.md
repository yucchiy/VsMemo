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
- **Modern Patterns**: Use factory functions and mock objects for clean, maintainable tests
- **VS Code Testing**: Tests use the VS Code test framework with Mocha
- **Test Organization**: Nested test suites by feature/component

### Test Patterns

```typescript
// Factory pattern for test data
const createMockConfigService = (): IConfigService => ({
  loadConfig: () => Promise.resolve(createDefaultConfig())
});

// Nested test organization
describe('CreateMemoUseCase', () => {
  describe('when creating new memo', () => {
    it('should create file and open it', async () => {
      // Test implementation
    });
  });
});
```

Run tests with `npm run test` which automatically compiles and lints before testing.

## Development Rules

### Commit Messages

**IMPORTANT**: Never include Claude Code signatures in commit messages:
- ❌ Don't include: `🤖 Generated with [Claude Code]`
- ❌ Don't include: `Co-Authored-By: Claude <noreply@anthropic.com>`
- ✅ Use clean, descriptive commit messages focused on the change

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