# VsMemo

A comprehensive memo management system for VS Code that transforms how you create, link, and explore your notes. VsMemo combines template-based creation, intelligent cross-linking, backlink analysis, and interactive graph visualization to create a powerful knowledge management experience.

## Features

### 📝 Template-Based Memo Creation
- Create memos using configurable types and templates
- Variable substitution with system variables (`{YEAR}`, `{MONTH}`, `{DAY}`, `{DATE}`, `{TITLE}`) and custom user-defined variables
- Organized memo types with dedicated directories
- Automatic file naming and directory creation

### 🔗 Cross-Memo Linking System
- **Custom URI Scheme**: Use `vsmemo://path/to/memo.md` syntax for cross-references
- **Go-to-Definition**: Navigate to linked memos using VS Code's standard F12 functionality
- **Hover Information**: Preview memo content by hovering over links
- **IntelliSense Completion**: Auto-complete memo paths while typing
- **Markdown Preview Support**: Clickable links in preview mode
- **Link Insertion**: Interactive command to insert links with file selection

### 🔍 Backlink Analysis
- **Automatic Indexing**: Real-time tracking of all memo cross-references
- **Backlink View**: Tree view showing which files reference the current memo
- **Orphaned File Detection**: Find memos with no incoming links
- **Link Statistics**: Analytics on memo connectivity and relationships
- **Dynamic Updates**: Automatic refresh on file save and edit

### 📊 Interactive Graph Visualization
- **Relationship Graph**: Cytoscape.js-powered visualization of memo connections
- **Multiple Display Modes**:
  - **Focus Mode**: Active file + directly connected memos
  - **Context Mode**: Active file + 2 degrees of separation
  - **Full Mode**: Complete memo network
- **Active File Tracking**: Graph automatically updates when switching files
- **Visual Highlighting**: Active file emphasized with distinctive styling
- **Toolbar Controls**: Easy switching between display modes

### 🎯 VS Code Integration
- **Explorer Views**: Two custom tree views (VsMemo Explorer, Backlinks)
- **13 Commands**: Comprehensive set of memo operations accessible via Command Palette
- **Context Menus**: Right-click operations for rename/delete in Explorer
- **Language Providers**: Enhanced Markdown editing with definition, hover, and completion
- **Event-Driven Updates**: Responsive UI that reacts to file changes

## Installation

1. Install the extension from the VS Code Marketplace
2. Open a workspace folder
3. Create a `.vsmemo` directory in your workspace root
4. Create a `config.json` configuration file (see Configuration section)

## Configuration

Create a `.vsmemo/config.json` file in your workspace root:

```json
{
  "baseDir": "memos",
  "fileExtensions": [".md", ".markdown"],
  "memoTypes": [
    {
      "id": "daily",
      "name": "Daily Note",
      "templatePath": "templates/daily.md"
    },
    {
      "id": "project",
      "name": "Project Note",
      "templatePath": "templates/project.md"
    },
    {
      "id": "meeting",
      "name": "Meeting Note",
      "templatePath": "templates/meeting.md"
    }
  ],
  "variables": {
    "AUTHOR": "Your Name",
    "COMPANY": "Your Company"
  }
}
```

### Template Files

Create template files in your `.vsmemo/templates/` directory. For example:

**`.vsmemo/templates/daily.md`**:
```markdown
---
title: {TITLE}
date: {DATE}
path: daily/{YEAR}/{MONTH}/{DAY}.md
tags: [daily]
---

# {TITLE}

## Tasks
- [ ] 

## Notes

## Reflections

```

**`.vsmemo/templates/project.md`**:
```markdown
---
title: {TITLE}
type: project
created: {DATE}
path: projects/{TITLE}.md
---

# {TITLE}

## Overview

## Goals

## Resources

## Progress

```

## Usage

### Creating Memos
1. Use **Command Palette** → `VsMemo: Create New Memo`
2. Select a memo type from the dropdown
3. Enter a title when prompted
4. The memo will be created with the template and opened

### Linking Memos
1. **Insert Link**: Use `VsMemo: Insert Memo Link` command to browse and select files
2. **Manual Linking**: Type `[Link Text](vsmemo://path/to/memo.md)`
3. **Navigation**: Use F12 (Go to Definition) on any vsmemo:// link
4. **Preview**: Hover over links to see content preview

### Exploring Relationships
1. **Backlink View**: Open the Backlinks panel in Explorer to see incoming references
2. **Graph View**: Use `VsMemo: Show Memo Graph` command for visual exploration
3. **Orphaned Files**: Use `VsMemo: Show Orphaned Memos` to find isolated notes
4. **Statistics**: Use `VsMemo: Show Link Statistics` for connectivity analytics

### File Management
- **Rename**: Right-click memo files in Explorer → Rename Memo
- **Delete**: Right-click memo files in Explorer → Delete Memo
- **Refresh**: Use refresh buttons in tree views to update indexes

## Commands

| Command | Description |
|---------|-------------|
| `VsMemo: Create New Memo` | Create a new memo using templates |
| `VsMemo: Insert Memo Link` | Insert a link to another memo |
| `VsMemo: Show Backlinks` | Display backlinks for current file |
| `VsMemo: Show Memo Graph` | Open interactive graph visualization |
| `VsMemo: Show Orphaned Memos` | Find memos with no incoming links |
| `VsMemo: Show Link Statistics` | Display connectivity analytics |
| `VsMemo: Refresh Backlink Index` | Rebuild backlink database |
| `VsMemo: Rename Memo` | Rename memo file |
| `VsMemo: Delete Memo` | Delete memo file |
| `VsMemo: List Memos` | Browse all memos |
| `VsMemo: Commit Memo Changes` | Commit changes via Git |

## Requirements

- VS Code 1.101.0 or higher
- Git (for commit functionality)
- Workspace folder (memos are workspace-specific)

## File Structure

VsMemo organizes your memos in a structured way:

```
your-workspace/
├── .vsmemo/
│   └── types.json          # Configuration file
└── memos/                  # Base directory (configurable)
    ├── daily/              # Memo type directories
    │   ├── 2025-01-15.md
    │   └── 2025-01-16.md
    ├── projects/
    │   ├── project-alpha.md
    │   └── project-beta.md
    └── meetings/
        ├── team-standup-jan.md
        └── client-review.md
```

## Extension Settings

VsMemo currently uses file-based configuration (`.vsmemo/types.json`). No VS Code settings are required.

## Known Issues

- Graph visualization requires modern browsers (uses Cytoscape.js)
- Large memo collections (1000+ files) may experience slower indexing
- Git functionality requires a Git repository in the workspace

## Contributing

This extension is open source. Feel free to contribute improvements, report issues, or suggest features on [GitHub](https://github.com/yucchiy/VsMemo).

### Development

1. Clone the repository
2. Run `npm install` to install dependencies
3. Use `F5` in VS Code to launch Extension Development Host
4. Make changes and test functionality
5. Run `npm test` to ensure tests pass

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for detailed development guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Enjoy building your knowledge base with VsMemo!** 🚀