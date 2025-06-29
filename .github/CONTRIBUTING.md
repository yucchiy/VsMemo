# Contributing to VsMemo

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yucchiy/VsMemo.git
   cd VsMemo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile TypeScript:
   ```bash
   npm run compile
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Development Workflow

### Running the Extension
1. Open the project in VS Code
2. Press `F5` to launch a new Extension Development Host window
3. Test the extension functionality

### Making Changes
1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run tests: `npm test`
4. Run linting: `npm run lint`
5. Commit changes with descriptive messages
6. Push and create a pull request

## Release Process

### Automated Release (Recommended)

1. **Update version** in `package.json` and `CHANGELOG.md`
2. **Commit changes**: `git commit -m "Bump version to x.y.z"`
3. **Create tag**: `git tag v0.1.0`
4. **Push tag**: `git push origin v0.1.0`
5. **GitHub Actions automatically**:
   - Runs tests
   - Packages extension
   - Creates GitHub release
   - Publishes to VS Code Marketplace

### Manual Release

1. **Package**: `npm run package`
2. **Publish**: `npm run publish` (requires VSCE_PAT token)

## GitHub Actions Setup

### Required Secrets

To enable automatic publishing, add these secrets to your GitHub repository:

1. **VSCE_PAT**: VS Code Marketplace Personal Access Token
   - Go to [Azure DevOps](https://dev.azure.com/)
   - Create a Personal Access Token with Marketplace (Manage) scope
   - Add as repository secret

### Workflow Files

- **`.github/workflows/ci.yml`**: Runs on every push/PR
  - Tests on multiple platforms (Windows, macOS, Linux)
  - Compiles and packages extension
  - Uploads artifacts

- **`.github/workflows/release.yml`**: Runs on tag push
  - Creates GitHub release
  - Publishes to VS Code Marketplace
  - Uploads VSIX file

## Code Quality

- **ESLint**: Code linting with TypeScript rules
- **TypeScript**: Strict mode enabled
- **Testing**: Comprehensive test coverage required
- **Architecture**: Follow established patterns (see CLAUDE.md)

## Commit Message Guidelines

- Use descriptive commit messages
- Start with verb (Add, Fix, Update, Remove)
- Keep first line under 72 characters
- Reference issues when applicable

Examples:
- `Add graph visualization feature`
- `Fix backlink indexing performance issue`
- `Update README with new installation steps`

## Pull Request Process

1. Ensure tests pass
2. Update documentation if needed
3. Add entry to CHANGELOG.md if applicable
4. Request review from maintainers
5. Address feedback
6. Squash commits if requested