import { subDays, format } from 'date-fns';

interface FilterPanelProps {
  filters: {
    dateFilter: {
      type: '1-week' | '1-month' | '2-months' | '3-months';
      from?: string;
      to?: string;
    };
    userFilter: string;
    exportTypes: string[];
    format: string;
    outputPath: string;
  };
  contributors: string[];
  onFiltersChange: (filters: any) => void;
}

function FilterPanel({ filters, contributors, onFiltersChange }: FilterPanelProps) {
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleDateRangeChange = (type: '1-week' | '1-month' | '2-months' | '3-months') => {
    const today = new Date();
    let from = '';
    let to = format(today, 'yyyy-MM-dd');

    if (type === '1-week') {
      from = format(subDays(today, 7), 'yyyy-MM-dd');
    } else if (type === '1-month') {
      from = format(subDays(today, 30), 'yyyy-MM-dd');
    } else if (type === '2-months') {
      from = format(subDays(today, 60), 'yyyy-MM-dd');
    } else if (type === '3-months') {
      from = format(subDays(today, 90), 'yyyy-MM-dd');
    }

    onFiltersChange({
      ...filters,
      dateFilter: {
        type,
        from,
        to,
      },
    });
  };

  const exportTypeOptions = [
    { value: 'prs', label: 'Pull Requests' },
    { value: 'commits', label: 'Commits' },
    { value: 'issues', label: 'Issues' },
    { value: 'releases', label: 'Releases' },
    { value: 'branches', label: 'Branches' },
    { value: 'full-backup', label: '📦 Full Backup (All Data Types)', isFullBackup: true },
  ];

  const toggleExportType = (type: string) => {
    const current = filters.exportTypes;

    // Handle full backup option
    if (type === 'full-backup') {
      const allTypes = ['prs', 'commits', 'issues', 'releases', 'branches'];
      const hasAll = allTypes.every((t) => current.includes(t));
      updateFilter('exportTypes', hasAll ? [] : allTypes);
      return;
    }

    const updated = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
    updateFilter('exportTypes', updated);
  };

  return (
    <div className="filter-panel">
      <div className="filter-group">
        <label className="filter-label">📅 Date Range:</label>
        <div className="date-range-buttons">
          <button
            className={`btn-filter ${filters.dateFilter.type === '1-week' ? 'active' : ''}`}
            onClick={() => handleDateRangeChange('1-week')}
          >
            1 Week
          </button>
          <button
            className={`btn-filter ${filters.dateFilter.type === '1-month' ? 'active' : ''}`}
            onClick={() => handleDateRangeChange('1-month')}
          >
            1 Month
          </button>
          <button
            className={`btn-filter ${filters.dateFilter.type === '2-months' ? 'active' : ''}`}
            onClick={() => handleDateRangeChange('2-months')}
          >
            2 Months
          </button>
          <button
            className={`btn-filter ${filters.dateFilter.type === '3-months' ? 'active' : ''}`}
            onClick={() => handleDateRangeChange('3-months')}
          >
            3 Months
          </button>
        </div>

        <div className="date-preview">
          Selected: {filters.dateFilter.from} → {filters.dateFilter.to}
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-label">👥 Filter by User:</label>
        <select
          className="user-select"
          value={filters.userFilter}
          onChange={(e) => updateFilter('userFilter', e.target.value)}
        >
          <option value="">All Users</option>
          {contributors.map((user) => (
            <option key={user} value={user}>
              {user}
            </option>
          ))}
        </select>
        {filters.userFilter && (
          <div className="filter-info">
            Filtering data for: <strong>{filters.userFilter}</strong>
          </div>
        )}
      </div>

      <div className="filter-group">
        <label className="filter-label">📦 Export Types:</label>
        <div className="export-types">
          {exportTypeOptions.map((option) => {
            const isChecked = option.isFullBackup
              ? ['prs', 'commits', 'issues', 'releases', 'branches'].every((t) =>
                  filters.exportTypes.includes(t)
                )
              : filters.exportTypes.includes(option.value);

            return (
              <label
                key={option.value}
                className={`checkbox-label ${option.isFullBackup ? 'full-backup-option' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleExportType(option.value)}
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FilterPanel;
