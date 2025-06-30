# VsMemo v0.4.0 Release Notes

## 🔄 Configuration File Migration

This release introduces a more intuitive configuration file naming convention and includes automatic migration support for existing users.

### What Changed

The configuration file has been renamed from `types.json` to `config.json` to better reflect its purpose as a general configuration file containing not just memo types, but also variables, file extensions, and other settings.

### Automatic Migration

When you first use VsMemo v0.4.0, the extension will automatically:

1. **Detect** if you have an existing `.vsmemo/types.json` file
2. **Migrate** the contents to `.vsmemo/config.json`
3. **Delete** the old `types.json` file
4. **Notify** you of the successful migration

No manual intervention is required!

### Manual Migration (if needed)

If automatic migration fails for any reason, you can manually rename your configuration file:

```bash
mv .vsmemo/types.json .vsmemo/config.json
```

## 🐛 Bug Fixes

- **Variables Preservation**: User-defined variables in the configuration are now properly preserved during validation
- **Test Coverage**: Improved test coverage for configuration service and backlink service

## 📝 Documentation Updates

All documentation has been updated to reference `config.json` instead of `types.json`.

## 🔧 Technical Details

- Added `protected` visibility to `getWorkspaceRoot()` method for better testability
- Enhanced mock implementations in test suites
- Improved file system operation handling in tests

---

**Note**: This is a breaking change in terms of configuration file naming, but the automatic migration ensures a smooth transition for existing users.