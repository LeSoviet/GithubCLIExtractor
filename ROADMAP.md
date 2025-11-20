# GitHub Extractor CLI — Roadmap

A universal cross-platform CLI tool (Node.js) that allows users to extract Pull Requests, Commits, Branches, Issues, Releases, and generate complete documentation automatically using GitHub CLI (`gh`).

---

## 1. Vision

Build a **robust, user-friendly CLI** that allows any developer to:

1. Install GitHub CLI.
2. Install this tool (`npm install -g ghextractor`).
3. Run:
```bash
ghextractor
```

Automatically scan their GitHub account, list repos, and let the user choose one.

Export any type of GitHub data (PRs, commits, branches, issues, releases) into Markdown, JSON, or full backups.

**The tool must never modify repositories—read-only access only.**

---

## 2. Core Features (MVP)

### ✔ 2.1 Welcome & Environment Check
- Detect if `gh` is installed.
- Detect if user is authenticated (`gh auth status`).
- Show welcome screen with user info.
- If not logged in, offer automatic `gh auth login`.

### ✔ 2.2 Repository Scanner
Read all user repositories:

```bash
gh repo list <username> --json name,owner,description
```

Allow user to select:
- Their own repositories
- Organization repositories
- Starred repositories (optional)

### ✔ 2.3 Extraction Options Menu
Once repo is selected:

```
❯ Pull Requests
  Commits
  Branches
  Issues
  Releases
  Full Repository Backup
  Change repository
  Exit
```

### ✔ 2.4 Export Formats
User selects:
- Markdown
- JSON
- Both

### ✔ 2.5 Output Configuration
- Default: `./github-export`
- Allow custom folder
- Auto-create folder if missing

---

## 3. Data Extraction Modules

Each module uses `gh api` internally.

### ✔ 3.1 PR Exporter
- Export number, title, body, author, state, timestamps, labels.
- Create `PR-x.md` files.
- Decode unicode safely.
- Sanitize filenames.

### ✔ 3.2 Commit Exporter
- Export hash, author, message, date, files changed.
- Generate `COMMIT-<hash>.md`.

### ✔ 3.3 Branch Exporter
- List branches.
- Export last commit and metadata.

### ✔ 3.4 Issue Exporter
- Export number, title, body, labels, status.

### ✔ 3.5 Releases Exporter
- Export tags, changelogs, assets.

### ✔ 3.6 Full Backup Mode
- Runs all modules sequentially.

### 🔥 3.7 Rate Limiting & Retry Strategy (CRITICAL)
- Implement exponential backoff for failed requests
- Monitor rate limit headers (`X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- Add automatic retry with delays when approaching limits
- Support token rotation for high-volume exports
- Display rate limit status to users in real-time
- Pause operations when rate limit is exhausted

**Why Critical:** GitHub enforces strict limits:
- REST API: 5,000 requests/hour
- GraphQL API: 5,000 points/hour
- Secondary limits: 100 concurrent requests max

### 🚀 3.8 GraphQL Integration
- Migrate heavy data fetching to GraphQL API
- Reduce API calls by 4-10x using batch queries
- Fetch PRs, commits, and issues in single queries
- Implement efficient pagination with cursor-based approach
- Smart API selection (REST vs GraphQL based on operation)

**Performance Impact:** Single GraphQL query can replace 10+ REST calls.

### 💾 3.9 Caching & ETag Support
- Implement local cache for repository metadata
- Cache ETags for conditional requests (304 responses don't count toward rate limit)
- Add `--force-refresh` flag to bypass cache
- Store cache in `~/.ghextractor/cache/`
- Automatic cache invalidation after 24 hours

**Impact:** ETag caching reduces rate limit usage by ~70% on repeated operations.

### 🛡️ 3.10 Error Handling & Recovery
- Graceful handling of network failures
- Resume interrupted exports from last checkpoint
- Clear error messages with suggested solutions
- Retry failed operations automatically
- Log errors to `~/.ghextractor/logs/`
- Export progress state for large operations

---

## 4. User Experience Flow

**Step 1** — User types:
```bash
ghextractor
```

**Step 2** — Welcome
```
Welcome to GitHub Extractor CLI!

✔ Logged in as: johndoe
```

**Step 3** — Repository Scan
```
Scanning repositories...
Found 42 repositories.

Select a repository:
❯ radialradio
  my-portfolio
  backend-service
  …
```

**Step 4** — Action Menu
```
What would you like to export?
❯ Pull Requests
  Commits
  Branches
  Issues
  Releases
  Full Backup
```

**Step 5** — Format
```
Select output format:
❯ Markdown
  JSON
  Both
```

**Step 6** — Export with Progress
```
Fetching PRs… (87 found)

Exporting Pull Requests:
████████████████████░░░░ 80% | 70/87 | Rate Limit: 4,234/5,000 | ETA: 12s

✔ Exported PR-12.md
✔ Exported PR-13.md
...
✔ Export completed: ./github-export/radialradio/prs/

Summary:
- Total PRs: 87
- Exported: 87
- Failed: 0
- API Calls: 95
- Cache Hits: 23 (24%)
- Duration: 1m 23s
```

---

## 5. Cross-Platform Requirements

### Targets:
- Windows (PowerShell)
- macOS
- Linux

### Achieved By:
- Node.js 18+ for all logic (LTS support)
- GitHub CLI (`gh`) for API access
- **Modern CLI Libraries (2025):**
  - `@clack/prompts` or `enquirer` (modern alternative to inquirer - faster, better UX)
  - `chalk` v5+ (ESM support, vibrant colors)
  - `ora` (elegant terminal spinners)
  - `cli-progress` (progress bars for long operations)
- `fs/promises` for async filesystem operations
- `bottleneck` for rate limiting
- `conf` for configuration management
- No OS-specific code (pure cross-platform)

---

## 6. Extensions (Phase 2)

### 6.1 Automatic Repo Sync Scheduler
Run daily exports to keep documentation up-to-date.

### 6.2 GitHub Actions Integration
Generate the same exports automatically inside CI.

### 6.3 Templates Customization
User-defined MD templates for PRs/Commits.

### 6.4 PDF Exporter
Convert Markdown → PDF.

### 6.5 Local Git Repository Scanner
Extract commits/branches without GitHub.

### 6.6 Watch Mode & Webhooks
- Monitor repository changes in real-time
- Use GitHub Webhooks instead of polling
- Auto-export when new PRs/Issues are created
- Reduce API consumption by 95%
- Background daemon mode for continuous monitoring

### 6.7 Configuration File Support
- Support `.ghextractorrc.json` or `ghextractor.config.js`
- Allow users to define:
  - Default export formats
  - Custom output paths
  - Excluded labels/branches
  - Custom templates
  - Rate limit thresholds
  - Parallel export settings

### 6.8 Advanced Filtering
- Export specific date ranges
- Filter by author, labels, or state
- Export only changed files matching patterns
- Exclude bot-generated content
- Search and export by keywords

### 6.9 Diff Mode (Incremental Exports)
- Export only changes since last run
- Smart detection of new/modified content
- Minimal API usage for updates
- Perfect for scheduled documentation updates

### 6.10 Parallel Export Operations
- Export multiple resources simultaneously
- Configurable concurrency limits
- Respect rate limits while maximizing throughput
- Progress tracking for each operation

---

## 7. Technical Architecture

### 7.1 Directory Structure (Updated for 2025 Best Practices)

```
github-extractor-cli/
│
├── bin/
│   └── ghextractor.js                # CLI entry point
├── src/
│   ├── index.ts                      # Main entry (TypeScript)
│   ├── cli/
│   │   ├── prompts.ts                # UI prompts (@clack/prompts)
│   │   ├── progress.ts               # Progress bars & spinners
│   │   └── menu.ts                   # Menu system
│   ├── core/
│   │   ├── github-client.ts          # Unified GitHub API client
│   │   ├── rate-limiter.ts           # Rate limit handler with backoff
│   │   ├── cache.ts                  # ETag caching system
│   │   ├── retry.ts                  # Exponential backoff logic
│   │   └── graphql-client.ts         # GraphQL API wrapper
│   ├── scanner/
│   │   ├── repo-scanner.ts           # Repository discovery
│   │   └── org-scanner.ts            # Organization scanner
│   ├── exporters/
│   │   ├── base-exporter.ts          # Abstract base class
│   │   ├── prs.ts                    # Pull Request exporter
│   │   ├── commits.ts                # Commit exporter
│   │   ├── branches.ts               # Branch exporter
│   │   ├── issues.ts                 # Issue exporter
│   │   ├── releases.ts               # Release exporter
│   │   └── full-backup.ts            # Orchestrator for full backups
│   ├── templates/
│   │   ├── pr.hbs                    # Handlebars template for PRs
│   │   ├── commit.hbs                # Commit template
│   │   ├── issue.hbs                 # Issue template
│   │   └── release.hbs               # Release template
│   ├── utils/
│   │   ├── exec-gh.ts                # GitHub CLI command executor
│   │   ├── output.ts                 # File output handler
│   │   ├── sanitize.ts               # Filename sanitization
│   │   ├── logger.ts                 # Winston/Pino logging
│   │   ├── config.ts                 # Config file loader
│   │   └── checkpoint.ts             # Resume capability
│   └── types/
│       ├── index.ts                  # Common types
│       ├── github.ts                 # GitHub API types
│       └── config.ts                 # Configuration types
├── tests/
│   ├── unit/                         # Unit tests
│   ├── integration/                  # Integration tests
│   └── e2e/                          # End-to-end tests
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Continuous integration
│       ├── release.yml               # Automated releases
│       └── security.yml              # Security scanning
├── docs/
│   ├── API.md                        # API documentation
│   ├── CONTRIBUTING.md               # Contribution guidelines
│   └── examples/                     # Usage examples
├── package.json
├── tsconfig.json                     # TypeScript configuration
├── .npmignore                        # npm publish exclusions
├── .nvmrc                            # Node version specification
├── LICENSE
├── SECURITY.md                       # Security policy
└── CHANGELOG.md                      # Automated changelog
```

### 7.2 Key Architecture Decisions

**TypeScript First:**
- Better type safety and IDE support
- Catch errors at compile time
- Self-documenting code with interfaces

**Modular Design:**
- Base exporter class for shared logic
- Pluggable exporters for extensibility
- Clear separation of concerns

**Modern ES Modules:**
- ESM as primary format
- CJS compatibility for legacy support
- Tree-shakeable exports

---

## 8. Milestones

### ✅ Milestone 1 — Core CLI (MVP) - COMPLETED
- [x] Init project structure with TypeScript
- [x] Setup development environment (ESLint, Prettier, Husky)
- [x] GH auth detection and status checks
- [x] Repo scanner with organization support
- [x] PR exporter with basic fields
- [x] Basic Markdown output
- [x] Error handling foundation

**Deliverable:** ✅ Functional CLI that can export PRs to Markdown.

### ✅ Milestone 2 — Additional Exporters - COMPLETED
- [x] Commits exporter with file changes
- [x] Branches exporter with metadata
- [x] Issues exporter with comments
- [x] Releases exporter with assets
- [x] JSON format support
- [x] Progress bars and spinners (ora)
- [x] Base exporter abstract class
- [x] Full backup mode orchestrator

**Deliverable:** ✅ Complete data extraction for all GitHub resources.

### ✅ Milestone 3 — Performance & Reliability (CRITICAL) - COMPLETED
- [x] Rate limiting implementation with `bottleneck`
- [x] Exponential backoff retry logic
- [x] ETag caching system
- [x] Rate limit monitoring and display
- [x] Smart retry for retryable errors
- [x] Integrated into all API calls
- [ ] GraphQL API integration for batch operations (Phase 2)
- [ ] Checkpoint/resume capability for large exports (Phase 2)

**Deliverable:** ✅ Production-ready tool that handles rate limits gracefully.

### ✅ Milestone 4 — Full Backup + Configuration - COMPLETED
- [x] Full repository export mode (orchestrator)
- [x] Configurable output folders
- [x] Configuration file support (`.ghextractorrc.json`)
- [x] Custom template support (Handlebars)
- [x] Filtering options (date range, author, labels)
- [x] Template helpers and built-in templates
- [x] Example configuration file

**Deliverable:** ✅ Enterprise-ready backup solution with customization.

**Status:** ✅ All 4 milestones completed successfully! The project has a fully functional CLI with comprehensive export capabilities, rate limiting, caching, and customizable templates.

---

### Milestone 5 — Testing & Quality
- [ ] Unit tests (Vitest/Jest) - 80%+ coverage
- [ ] Integration tests with GitHub API
- [ ] E2E tests for CLI flows
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Security scanning (Snyk, npm audit)
- [ ] Performance benchmarks

**Deliverable:** Well-tested, secure codebase.

### Milestone 6 — Packaging & Distribution
- [ ] TypeScript compilation pipeline
- [ ] ESM + CJS dual package
- [ ] Make `ghextractor` global executable
- [ ] Publish to npm with provenance
- [ ] Automated changelog generation (conventional commits)
- [ ] Semantic versioning automation
- [ ] Documentation site (VitePress/Docusaurus)

**Deliverable:** Published npm package with professional documentation.

### Milestone 7 — Advanced Features (Phase 2)
- [ ] Watch mode with webhook integration
- [ ] Diff mode (incremental exports)
- [ ] PDF export capability
- [ ] GitHub Actions workflow generator
- [ ] Local git repository scanner
- [ ] Multi-repository batch exports
- [ ] Export analytics and statistics

**Deliverable:** Premium features for power users.

---

## 9. Priority Features (Ordered by Impact)

Development priorities based on user value and technical dependencies:

1. **🔴 Rate Limiting Handler** (CRITICAL)
   - Prevents API failures and service interruptions
   - Required before any production use
   - Foundation for all other features

2. **🟠 GraphQL Integration** (HIGH)
   - 4-10x faster exports
   - Dramatically reduces rate limit consumption
   - Better user experience for large repos

3. **🟠 ETag Caching** (HIGH)
   - ~70% reduction in API calls for repeat operations
   - Enables efficient incremental updates
   - Essential for scheduled exports

4. **🟡 Progress Indicators** (MEDIUM)
   - Better UX for long operations
   - Builds user confidence
   - Professional polish

5. **🟡 TypeScript Migration** (MEDIUM)
   - Better developer experience
   - Fewer runtime bugs
   - Self-documenting code

6. **🟡 Resume Capability** (MEDIUM)
   - Handle large repos without restarts
   - Recover from network failures
   - Critical for enterprise use

7. **🟢 Parallel Exports** (LOW)
   - Export multiple resources simultaneously
   - Maximize throughput within rate limits
   - Nice-to-have optimization

8. **🟢 Filtering Options** (LOW)
   - Export specific date ranges, authors, labels
   - Targeted data extraction
   - Power user feature

9. **🟢 Diff Mode** (LOW)
   - Export only changes since last run
   - Minimal API usage for updates
   - Perfect for automation

10. **🔵 GitHub Actions Integration** (FUTURE)
    - Automated documentation updates
    - CI/CD integration
    - Phase 2 feature

---

## 10. Package.json Structure (Modern 2025 Best Practices)

```json
{
  "name": "ghextractor",
  "version": "1.0.0",
  "description": "Universal CLI tool to extract GitHub data (PRs, commits, issues, releases) into Markdown/JSON",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "bin": {
    "ghextractor": "./bin/ghextractor.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": [
    "github",
    "cli",
    "extractor",
    "export",
    "backup",
    "documentation",
    "pull-requests",
    "issues",
    "commits"
  ],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/ghextractor"
  },
  "dependencies": {
    "@clack/prompts": "^0.8.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "cli-progress": "^3.12.0",
    "handlebars": "^4.7.8",
    "bottleneck": "^2.19.5",
    "conf": "^12.0.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.10.0",
    "@types/cli-progress": "^3.11.5",
    "tsup": "^8.0.0",
    "tsx": "^4.7.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "prettier": "^3.2.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.2.0"
  }
}
```

---

## 11. Final Goal

A **zero-friction, production-ready CLI** where any developer can:

- ✅ **Authenticate** with GitHub in seconds
- ✅ **Scan repositories** across personal, org, and starred repos
- ✅ **Export any GitHub data** (PRs, commits, branches, issues, releases)
- ✅ **Choose formats** (Markdown, JSON, or both)
- ✅ **Handle rate limits** gracefully with automatic retry
- ✅ **Resume interrupted exports** for large repositories
- ✅ **Customize output** with templates and filters
- ✅ **Automate workflows** with config files and scheduling

**For use cases:**
- 📚 Documentation generation
- 💾 Repository backups
- 🔍 Audit and compliance
- 📊 Analytics and reporting
- 🔄 Migration workflows

**The fastest, safest, and most reliable way to extract your entire GitHub workflow.**

### Success Metrics

- **Performance:** Export 1000+ PRs in under 5 minutes
- **Reliability:** 99.9% success rate with automatic recovery
- **Rate Limit Efficiency:** <2000 API calls for typical repo export
- **User Experience:** Zero configuration required for basic usage
- **Adoption:** 10K+ npm downloads in first 6 months

---

## 12. Development Best Practices (2025 Standards)

### Code Quality
- **TypeScript Strict Mode:** Enable all strict checks for maximum type safety
- **ESLint Configuration:** Use `@typescript-eslint` with recommended rules
- **Prettier Integration:** Consistent code formatting across the project
- **Husky Pre-commit Hooks:** Run linting and tests before commits
- **Conventional Commits:** Automated changelog generation

### Security
- **npm audit:** Regular security vulnerability scans
- **Snyk Integration:** Continuous dependency monitoring
- **npm provenance:** Package transparency and verification
- **Lockfile Commitment:** Ensure reproducible installations
- **Minimal Dependencies:** Reduce attack surface

### Testing Strategy
- **Unit Tests:** Test individual functions and modules (80%+ coverage)
- **Integration Tests:** Test GitHub API interactions with test fixtures
- **E2E Tests:** Test complete user flows with real CLI execution
- **Snapshot Tests:** Ensure output consistency
- **Performance Tests:** Benchmark critical operations

### CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
- Run tests on Node 18, 20, 22
- Run linting and type checking
- Run security audit
- Generate coverage reports
- Build package artifacts

# .github/workflows/release.yml
- Automated semantic versioning
- Generate changelog from commits
- Publish to npm with provenance
- Create GitHub release with notes
- Update documentation site
```

### Documentation Standards
- **README.md:** Quick start, installation, basic usage
- **API.md:** Complete API reference with TypeDoc
- **CONTRIBUTING.md:** Development setup and guidelines
- **SECURITY.md:** Security policy and vulnerability reporting
- **CHANGELOG.md:** Automated changelog with semantic-release
- **Examples Directory:** Real-world usage examples

### Git Workflow
- **Main Branch:** Production-ready code only
- **Feature Branches:** `feature/rate-limiting`, `feature/graphql`
- **Release Tags:** Semantic versioning (`v1.0.0`, `v1.1.0`)
- **Protected Main:** Require PR reviews and passing tests
- **Squash Merges:** Clean commit history

### Performance Optimization
- **Lazy Loading:** Import heavy modules only when needed
- **Stream Processing:** Handle large datasets without loading into memory
- **Worker Threads:** Parallelize CPU-intensive operations (optional)
- **Caching Strategy:** Cache metadata and API responses
- **Bundle Size:** Keep CLI lightweight (<5MB installed)

### Error Handling Philosophy
```typescript
// Good: Specific, actionable error messages
throw new Error(`Rate limit exceeded. Resets at ${resetTime}. Use --token-rotation for higher limits.`);

// Bad: Generic error messages
throw new Error('API error');
```

### Logging Best Practices
- **Debug Mode:** `ghextractor --debug` for verbose output
- **Log Files:** Store in `~/.ghextractor/logs/` with rotation
- **Structured Logging:** JSON format for programmatic parsing
- **Log Levels:** ERROR, WARN, INFO, DEBUG
- **Privacy:** Never log authentication tokens or sensitive data

---

## 13. Competitive Advantages

What makes this tool unique:

1. **Zero Configuration:** Works out of the box with GitHub CLI
2. **Rate Limit Aware:** Never fails due to API limits
3. **Resume Capability:** Handle enterprise-scale repositories
4. **Modern Architecture:** TypeScript, ESM, latest best practices
5. **Template System:** Fully customizable output formats
6. **Offline First:** Cache-enabled for repeated operations
7. **CI/CD Ready:** Perfect for automated documentation
8. **Open Source:** MIT licensed, community-driven

---

## 14. Future Vision (Beyond Phase 2)

Potential extensions for the ecosystem:

- **Desktop App:** Electron-based GUI wrapper
- **VS Code Extension:** Export directly from IDE
- **Browser Extension:** Export from GitHub web interface
- **API Service:** Cloud-based export service
- **Team Dashboard:** Analytics and insights for organizations
- **AI Integration:** Automated PR summaries with LLMs
- **Multi-Platform:** GitLab, Bitbucket support

---

**Last Updated:** January 2025
**Status:** Planning Phase
**Target Release:** Q2 2025
