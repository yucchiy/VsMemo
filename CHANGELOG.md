# Change Log

All notable changes to the VsMemo extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-16

### Added

#### Core Memo Management
- Template-based memo creation with configurable memo types
- Variable substitution system supporting system variables (`{YEAR}`, `{MONTH}`, `{DAY}`, `{DATE}`, `{TITLE}`) and user-defined variables
- Automatic directory creation and file organization
- VsMemo Explorer tree view with type-based organization
- File operations (rename, delete) via Explorer context menu

#### Cross-Memo Linking System
- Custom `vsmemo://` URI scheme for cross-references
- Go-to-definition navigation (F12) for memo links
- Hover information with content preview
- IntelliSense completion for memo paths
- Markdown preview support with clickable links
- Interactive link insertion command with file selection

#### Backlink Analysis
- Comprehensive backlink indexing and tracking system
- Real-time Backlink tree view showing incoming references
- Orphaned file detection and listing
- Link statistics and connectivity analytics
- Automatic updates on file save and edit operations
- Backlink view with file grouping and reference counts

#### Interactive Graph Visualization
- Cytoscape.js-powered relationship graph visualization
- Three display modes:
  - Focus Mode: Active file + directly connected memos
  - Context Mode: Active file + 2 degrees of separation  
  - Full Mode: Complete memo network
- Active file tracking with automatic graph updates
- Visual highlighting of active file with distinctive styling
- Toolbar controls for easy mode switching
- Local library loading (no CDN dependencies)

#### VS Code Integration
- 13 comprehensive commands accessible via Command Palette
- 2 custom tree views (VsMemo Explorer, Backlinks)
- 3 language providers (Definition, Hover, Completion)
- Advanced WebView integration with bidirectional messaging
- Event-driven updates throughout the application
- Proper VS Code extension patterns and best practices

#### Technical Features
- Comprehensive service architecture with dependency injection
- Interface-based design for testability
- Mock-based testing infrastructure
- Git integration for memo change management
- Configuration system via `.vsmemo/types.json`
- Support for both `.md` and `.markdown` file extensions

### Commands Added
- `VsMemo: Create New Memo` - Template-based memo creation
- `VsMemo: Insert Memo Link` - Interactive link insertion
- `VsMemo: Show Backlinks` - Display backlinks for current file
- `VsMemo: Show Memo Graph` - Open interactive graph visualization
- `VsMemo: Show Orphaned Memos` - Find memos with no incoming links
- `VsMemo: Show Link Statistics` - Display connectivity analytics
- `VsMemo: Refresh Backlink Index` - Rebuild backlink database
- `VsMemo: Rename Memo` - Rename memo file with proper handling
- `VsMemo: Delete Memo` - Delete memo file with confirmation
- `VsMemo: List Memos` - Browse all memos in workspace
- `VsMemo: Commit Memo Changes` - Git integration for changes
- `VsMemo: Refresh Explorer` - Refresh memo tree view
- `VsMemo: Create Memo From Type` - Quick memo creation from Explorer

### Dependencies Added
- `cytoscape` ^3.32.0 - Graph visualization library
- `cytoscape-cose-bilkent` ^4.1.0 - Advanced graph layout algorithm
- `simple-git` ^3.28.0 - Git operations for memo management

## [0.2.0] - 2025-06-29

### Added
- **Logging Service Infrastructure**
  - `ILoggerService` interface for centralized logging
  - Configurable log levels (ERROR, WARN, INFO, DEBUG)
  - Structured log formatting with `[VsMemo]` prefix
  - Optional logger injection across services

- **Graph Data Service**
  - Extracted graph data generation logic from GraphView
  - Pure business logic separated from UI rendering
  - Support for three display modes (FOCUS, CONTEXT, FULL)
  - Improved testability and maintainability

- **Unified Memo Insights View**
  - Combined backlinks and note information in single view
  - Real-time note metadata display
  - Interactive backlink navigation
  - Support for orphaned memos and link statistics queries

### Changed
- **Enhanced IFileService Interface**
  - Added `listFiles()` for recursive file listing with extension filtering
  - Added `deleteFile()` for file deletion operations
  - Added `openTextDocument()` and `showTextDocument()` for better VS Code integration
  - VsCodeFileService updated with full implementation

- **Improved Error Handling**
  - BacklinkService enhanced with proper error logging
  - Structured exception handling with error types
  - Better error recovery and user feedback

- **Architecture Improvements**
  - Better separation of concerns in GraphView
  - Optional dependency injection for logging
  - Consistent service patterns across codebase

### Fixed
- Extension packaging now properly includes runtime dependencies
- Fixed "Cannot find module 'simple-git'" error on extension activation
- Improved VS Code marketplace metadata and keywords
- Graph view active file highlighting consistency

### Technical Improvements
- Comprehensive test infrastructure preparation
- Updated documentation with architecture changes
- Improved code organization and maintainability
- Enhanced TypeScript strict mode compliance

## [0.3.0] - 2025-06-30

### Changed (Breaking Changes)
- **BREAKING**: `template` property in `memoTypes` renamed to `templatePath`
  - This property now correctly represents the file path to a template file
  - Previous usage was inconsistent (implementation expected file path, documentation showed content)
  - **Migration**: Update your `.vsmemo/types.json` to use `templatePath` instead of `template`

### Added
- Template file system with proper file path references
- Documentation for creating template files in `.vsmemo/templates/` directory
- Example template files for daily notes and project notes

### Fixed
- Corrected confusing property naming that caused implementation/documentation mismatch
- Default configuration now uses proper template file paths

### Migration Guide
If you have existing `.vsmemo/types.json` configuration:

**Before (v0.2.0)**:
```json
{
  "memoTypes": [
    {
      "name": "Daily Note",
      "template": "---\ntitle: {TITLE}\n---\n# {TITLE}"
    }
  ]
}
```

**After (v0.3.0)**:
```json
{
  "memoTypes": [
    {
      "id": "daily",
      "name": "Daily Note", 
      "templatePath": "templates/daily.md"
    }
  ]
}
```

And create the template file at `.vsmemo/templates/daily.md`.

## [Unreleased]

### Planned
- Restore and enhance test coverage for all services
- Performance optimizations for large memo collections
- Additional export/import formats
- Customizable graph visualization themes
- Enhanced search and filtering capabilities
- Plugin system for custom memo types