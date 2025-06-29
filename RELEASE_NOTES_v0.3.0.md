# VsMemo v0.3.0 Release Notes

## 🚨 Breaking Changes

This release contains **breaking changes** that require configuration updates.

### Template Property Renamed

The `template` property in `memoTypes` configuration has been renamed to `templatePath` to accurately reflect its purpose.

**What changed:**
- ❌ `template` property (confusing - implied content but expected file path)
- ✅ `templatePath` property (clear - indicates file path to template)

## 🔄 Migration Required

### Update Your Configuration

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

### Create Template Files

Create template files in your `.vsmemo/templates/` directory:

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

## ✨ Benefits

- **🎯 Clarity**: Property name now clearly indicates it's a file path
- **📝 Consistency**: Implementation and documentation finally match
- **🔧 Maintainability**: Template files are separate from configuration
- **🚀 Flexibility**: Easier to manage and version control templates

## 📦 Installation

1. Download `vsmemo-0.3.0.vsix`
2. Install: `code --install-extension vsmemo-0.3.0.vsix --force`
3. **Important**: Update your `.vsmemo/types.json` configuration
4. Create template files in `.vsmemo/templates/`
5. Reload VS Code

## 🛠️ Need Help?

- See the updated [README.md](readme.md) for complete examples
- Check [changelog.md](changelog.md) for detailed migration guide
- Report issues at: https://github.com/yucchiy/VsMemo/issues

---

**Download**: [vsmemo-0.3.0.vsix](vsmemo-0.3.0.vsix)  
**Repository**: https://github.com/yucchiy/VsMemo