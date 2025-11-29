/// <reference path="../types.d.ts" />

interface ExportPanelProps {
  filters: {
    format: string;
    outputPath: string;
    exportTypes: string[];
    generateAnalytics: boolean;
  };
  onFiltersChange: (filters: any) => void;
  onExport: () => void;
  exporting: boolean;
  selectedReposCount: number;
}

function ExportPanel({
  filters,
  onFiltersChange,
  onExport,
  exporting,
  selectedReposCount,
}: ExportPanelProps) {
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleSelectFolder = async () => {
    try {
      const folder = await window.electronAPI.selectFolder();
      console.log('[ExportPanel] Selected folder:', folder);
      if (folder) {
        console.log('[ExportPanel] Updating outputPath to:', folder);
        updateFilter('outputPath', folder);
        console.log('[ExportPanel] Filter updated, new filters:', {
          ...filters,
          outputPath: folder,
        });
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  return (
    <div className="export-panel">
      <div className="export-settings">
        <div className="setting-group">
          <label className="setting-label">📊 Export Format:</label>
          <div className="format-options">
            <label className="radio-label">
              <input
                type="radio"
                name="format"
                value="markdown"
                checked={filters.format === 'markdown'}
                onChange={(e) => updateFilter('format', e.target.value)}
              />
              Markdown
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="format"
                value="json"
                checked={filters.format === 'json'}
                onChange={(e) => updateFilter('format', e.target.value)}
              />
              JSON (+ MD report)
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={filters.format === 'pdf'}
                onChange={(e) => updateFilter('format', e.target.value)}
              />
              PDF (from MD)
            </label>
          </div>
        </div>

        <div className="setting-group">
          <label className="setting-label">💾 Output Path:</label>
          <div className="output-path-group">
            <input
              type="text"
              className="output-path-input"
              value={filters.outputPath}
              onChange={(e) => updateFilter('outputPath', e.target.value)}
              placeholder="./github-export"
            />
            <button className="btn-browse" onClick={handleSelectFolder}>
              📂 Browse
            </button>
          </div>
        </div>

        <div className="setting-group">
          <div className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.generateAnalytics}
              onChange={(e) => updateFilter('generateAnalytics', e.target.checked)}
            />
            <span>Generate analytics report after export</span>
          </div>
        </div>
      </div>

      <div className="export-summary">
        <h3>Export Summary:</h3>
        <ul>
          <li>
            <strong>Repositories:</strong> {selectedReposCount}
          </li>
          <li>
            <strong>Data Types:</strong> {filters.exportTypes.join(', ')}
          </li>
          <li>
            <strong>Format:</strong> {filters.format}
          </li>
          <li>
            <strong>Output:</strong> {filters.outputPath}
          </li>
          <li>
            <strong>Export Mode:</strong> Full Backup (Complete data export)
          </li>
          <li>
            <strong>Analytics:</strong> {filters.generateAnalytics ? 'Yes' : 'No'}
          </li>
        </ul>
      </div>

      <button
        className="btn-export"
        onClick={onExport}
        disabled={exporting || filters.exportTypes.length === 0}
      >
        {exporting ? '⏳ Exporting...' : '⬇️ Start Export'}
      </button>
    </div>
  );
}

export default ExportPanel;
