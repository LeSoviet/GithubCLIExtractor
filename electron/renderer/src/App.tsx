/// <reference path="./types.d.ts" />
import { useState, useEffect } from 'react';
import { useTheme } from './context/ThemeContext';
import { ThemeProvider } from './context/ThemeContext';
import RepositorySelector from './components/RepositorySelector';
import FilterPanel from './components/FilterPanel';
import ExportPanel from './components/ExportPanel';
import ProgressDisplay from './components/ProgressDisplay';
import Titlebar from './components/Titlebar';

interface Repository {
  owner: string;
  name: string;
  fullName: string;
}

interface ExportFilters {
  dateFilter: {
    type: 'last-week' | 'last-month' | 'custom' | 'all';
    from?: string;
    to?: string;
  };
  userFilter: string;
  exportTypes: string[];
  format: 'markdown' | 'json' | 'pdf';
  outputPath: string;
  generateAnalytics: boolean;
}

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Repository[]>([]);
  const [contributors, setContributors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<any>(null);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastExportPath, setLastExportPath] = useState<string>('');
  const [lastExportedRepo, setLastExportedRepo] = useState<Repository | null>(null);

  const [filters, setFilters] = useState<ExportFilters>({
    dateFilter: { type: 'all' },
    userFilter: '',
    exportTypes: ['prs', 'commits', 'issues'],
    format: 'markdown',
    outputPath: './github-export',
    generateAnalytics: true,
  });

  // Load repositories on mount
  useEffect(() => {
    loadRepositories();
  }, []);

  // Load contributors when selected repos change
  useEffect(() => {
    if (selectedRepos.length > 0) {
      // Load contributors from the first selected repo
      const firstRepo = selectedRepos[0];
      loadContributors(firstRepo.owner, firstRepo.name);
    }
  }, [selectedRepos]);

  // Setup export progress listeners
  useEffect(() => {
    window.electronAPI.onExportProgress((data: any) => {
      console.log('[App] Export progress update:', data);
      setExportProgress(data);
    });

    window.electronAPI.onExportComplete(() => {
      console.log('[App] Export complete event received');
      console.log('[App] Current lastExportPath before update:', lastExportPath);
      console.log('[App] Current filters.outputPath:', filters.outputPath);
      setExporting(false);
      setExportProgress(null);
      setExportComplete(true);
      setExportError(null);
      setLastExportPath(filters.outputPath);
      console.log('[App] Set lastExportPath to:', filters.outputPath);
      if (selectedRepos.length > 0) {
        setLastExportedRepo(selectedRepos[selectedRepos.length - 1]);
        console.log('[App] Set lastExportedRepo to:', selectedRepos[selectedRepos.length - 1]);
      }
      // Auto-hide success message after 5 seconds
      setTimeout(() => setExportComplete(false), 5000);
    });

    window.electronAPI.onExportError((error: string) => {
      console.log('[App] Export error event received:', error);
      setExporting(false);
      setExportProgress(null);
      setExportComplete(false);
      setExportError(error);
      // Auto-hide error message after 8 seconds
      setTimeout(() => setExportError(null), 8000);
    });
  }, []);

  const loadRepositories = async () => {
    setLoading(true);
    try {
      const repos = await window.electronAPI.getRepositories();
      setRepositories(repos);
    } catch (error) {
      console.error('Failed to load repositories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('not authenticated')) {
        alert(
          '❌ GitHub CLI is not authenticated!\n\n' +
            'Please run this command in your terminal:\n' +
            '  gh auth login\n\n' +
            'Then restart the application.'
        );
      } else {
        alert('Failed to load repositories. Make sure GitHub CLI is installed and authenticated.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadContributors = async (owner: string, name: string) => {
    try {
      const users = await window.electronAPI.getContributors(owner, name);
      setContributors(users);
    } catch (error) {
      console.error('Failed to load contributors:', error);
      setContributors([]);
    }
  };

  const handleExport = async () => {
    if (selectedRepos.length === 0) {
      setExportError('Please select at least one repository first');
      setTimeout(() => setExportError(null), 5000);
      return;
    }

    console.log('[App] handleExport called with filters.outputPath:', filters.outputPath);
    setExporting(true);
    setExportComplete(false);
    setExportError(null);
    setLastExportPath(filters.outputPath);
    console.log('[App] Set lastExportPath to:', filters.outputPath);
    setExportProgress({
      stage: 'Initializing export...',
      progress: 0,
      current: 0,
      total: selectedRepos.length,
    });

    try {
      const totalRepos = selectedRepos.length;

      // Export each repository
      for (let i = 0; i < totalRepos; i++) {
        const repo = selectedRepos[i];
        const repoProgress = (i / totalRepos) * 100;

        setExportProgress({
          stage: `Exporting ${repo.fullName} (${i + 1}/${totalRepos})`,
          progress: repoProgress,
          current: i + 1,
          total: totalRepos,
          currentRepo: repo.fullName,
        });

        console.log('[App] Exporting repo with outputPath:', filters.outputPath);
        await window.electronAPI.exportData({
          repository: repo,
          exportTypes: filters.exportTypes,
          format: filters.format,
          dateFilter:
            filters.dateFilter.type !== 'all'
              ? {
                  type: filters.dateFilter.type as 'last-week' | 'last-month' | 'custom',
                  from: filters.dateFilter.from,
                  to: filters.dateFilter.to,
                }
              : undefined,
          userFilter: filters.userFilter || undefined,
          outputPath: filters.outputPath,
          generateAnalytics: filters.generateAnalytics,
        });

        // Update last exported repo after each export
        setLastExportedRepo(repo);
      }

      // Final completion
      setExportProgress({
        stage: 'Export completed successfully!',
        progress: 100,
        current: totalRepos,
        total: totalRepos,
      });
    } catch (error) {
      console.error('Export error:', error);
      setExporting(false);
      setExportProgress(null);
      setExportError(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setExportError(null), 8000);
    }
  };

  return (
    <div className="app">
      <Titlebar />
      <header className="app-header">
        <div className="app-header-content">
          <h1>GitHub Extractor</h1>
          <p>Professional repository data extraction and analytics</p>
        </div>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </button>
      </header>

      <main className="app-main">
        <section className="section">
          <h2>Repository Selection</h2>
          <RepositorySelector
            repositories={repositories}
            selectedRepos={selectedRepos}
            onSelectRepos={setSelectedRepos}
            loading={loading}
            onRefresh={loadRepositories}
          />
        </section>

        {selectedRepos.length > 0 && (
          <>
            <section className="section">
              <h2>Configuration</h2>
              <FilterPanel
                filters={filters}
                contributors={contributors}
                onFiltersChange={setFilters}
              />
            </section>

            <section className="section">
              <h2>Export</h2>
              <ExportPanel
                filters={filters}
                onFiltersChange={setFilters}
                onExport={handleExport}
                exporting={exporting}
                selectedReposCount={selectedRepos.length}
              />
            </section>

            {exportProgress && (
              <section className="section">
                <ProgressDisplay progress={exportProgress} />
              </section>
            )}

            {exportComplete && (
              <section className="section success-message">
                <h3>Export Completed Successfully</h3>
                <p>
                  {selectedRepos.length === 1
                    ? `Repository exported to ${lastExportPath}/${lastExportedRepo?.owner}/${lastExportedRepo?.name}`
                    : `${selectedRepos.length} repositories exported to ${lastExportPath}`}
                </p>
              </section>
            )}

            {exportError && (
              <section className="section error-message">
                <h3>Export Failed</h3>
                <p>{exportError}</p>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>GitHub Extractor v0.9.2 - Professional Data Extraction Tool for Developers & PMs</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
