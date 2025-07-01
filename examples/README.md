# VsMemo Configuration Examples

This directory contains example configuration files demonstrating the three-tier directory structure and baseDir functionality in VsMemo.

## Directory Structure

With this example configuration, your memos will be organized as follows:

```
your-workspace/
├── .vsmemo/
│   ├── config.json          # Configuration file
│   └── templates/           # Template files
│       ├── daily.md
│       ├── project.md
│       ├── meeting.md
│       └── research.md
└── memos/                   # Base directory (config.baseDir)
    ├── daily-notes/         # MemoType baseDir
    │   └── archives/        # Template baseDir
    │       └── 2025/
    │           └── 01/
    │               ├── 15.md
    │               └── 16.md
    ├── projects/            # MemoType baseDir
    │   └── active/          # Template baseDir
    │       ├── project-alpha.md
    │       └── project-beta.md
    ├── meetings/            # MemoType baseDir (no template baseDir)
    │   └── 2025/
    │       └── 01/
    │           ├── team-standup.md
    │           └── client-review.md
    └── research/            # No memoType baseDir (uses ".")
        ├── market-analysis.md
        └── tech-evaluation.md
```

## BaseDir Hierarchy

VsMemo uses three levels of directory configuration:

1. **config.baseDir**: `"memos"` - Global base directory
2. **memoType.baseDir**: Per-memo-type directory (`"daily-notes"`, `"projects"`, etc.)
3. **template.baseDir**: Per-template directory (`"archives"`, `"active"`, etc.)

The final path is constructed as:
```
{workspace}/{config.baseDir}/{memoType.baseDir}/{template.baseDir}/{template.path}
```

If any baseDir is not specified, it defaults to `"."` (current directory level).

## Usage

1. Copy the contents of this `examples/` directory to your workspace as `.vsmemo`
2. Customize the configuration in `config.json` to match your needs
3. Modify the template files to fit your preferred memo structure
4. Start creating memos with `VsMemo: Create New Memo`

## Template Features

Each template demonstrates different aspects of VsMemo:

- **daily.md**: Shows date-based organization with nested year/month/day structure
- **project.md**: Shows single-file organization within a themed directory
- **meeting.md**: Shows date-based organization without template baseDir
- **research.md**: Shows simple organization without memoType baseDir

All templates include:
- Variable substitution (`{TITLE}`, `{DATE}`, `{AUTHOR}`, etc.)
- Frontmatter configuration
- Path and baseDir specifications
- Rich formatting with emojis and structured sections