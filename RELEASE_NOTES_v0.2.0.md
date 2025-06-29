# VsMemo v0.2.0 Release Notes

We're excited to announce VsMemo v0.2.0, featuring significant architectural improvements and enhanced user experience!

## 🎯 Highlights

### Unified Memo Insights View
- Combined backlinks and note information in a single, intuitive view
- Real-time metadata display for active memos
- Quick access to orphaned memos and link statistics

### Improved Architecture
- New logging service infrastructure for better debugging
- Extracted graph data service with cleaner separation of concerns
- Enhanced error handling throughout the extension

### Critical Fixes
- Fixed "Cannot find module 'simple-git'" error
- Proper packaging of runtime dependencies
- Improved graph view active file highlighting

## 📦 Installation

1. Download `vsmemo-0.2.0.vsix` from the releases page
2. In VS Code, run: `code --install-extension vsmemo-0.2.0.vsix`
3. Reload VS Code to activate

## 🔧 Technical Improvements

- **Logging Service**: Centralized logging with configurable levels (ERROR, WARN, INFO, DEBUG)
- **Graph Data Service**: Business logic separated from UI for better testability
- **Enhanced IFileService**: New methods for file operations and VS Code integration
- **Error Recovery**: Better handling of edge cases and user-friendly error messages

## 🚀 What's Next

- Comprehensive test coverage restoration
- Performance optimizations for large memo collections
- Additional export/import formats
- Customizable graph themes

## 📝 Full Changelog

See [changelog.md](changelog.md) for detailed changes.

## 🙏 Acknowledgments

Thank you to all users who provided feedback and reported issues. Your input helps make VsMemo better!

---

**Download**: [vsmemo-0.2.0.vsix](vsmemo-0.2.0.vsix)  
**Repository**: https://github.com/yucchiy/VsMemo  
**Issues**: https://github.com/yucchiy/VsMemo/issues