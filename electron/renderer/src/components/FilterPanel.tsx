import { subDays, format } from 'date-fns';

interface FilterPanelProps {
  filters: {
    dateFilter: {
      type: 'last-week' | 'last-month' | 'custom' | 'all';
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

  const updateDateFilter = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      dateFilter: { ...filters.dateFilter, [key]: value },
    });
  };

  const handleDateRangeChange = (type: 'last-week' | 'last-month' | 'custom' | 'all') => {
    const today = new Date();
    let from = '';
    let to = format(today, 'yyyy-MM-dd');

    if (type === 'last-week') {
      from = format(subDays(today, 7), 'yyyy-MM-dd');
    } else if (type === 'last-month') {
      from = format(subDays(today, 30), 'yyyy-MM-dd');
    }

    onFiltersChange({
      ...filters,
      dateFilter: {
        type,
        from: type !== 'all' ? from : undefined,
        to: type !== 'all' ? to : undefined,
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
            className={`btn-filter ${filters.dateFilter.type === 'all' ? 'active' : ''}`}
            onClick={() => handleDateRangeChange('all')}
          >
            All Time
          </button>
          <button
            className={`btn-filter ${filters.dateFilter.type === 'last-week' ? 'active' : ''}`}
            onClick={() => handleDateRangeChange('last-week')}
          >
            Last Week
          </button>
          <button
            className={`btn-filter ${filters.dateFilter.type === 'last-month' ? 'active' : ''}`}
            onClick={() => handleDateRangeChange('last-month')}
          >
            Last Month
          </button>
          <button
            className={`btn-filter ${filters.dateFilter.type === 'custom' ? 'active' : ''}`}
            onClick={() => handleDateRangeChange('custom')}
          >
            Custom Range
          </button>
        </div>

        {filters.dateFilter.type === 'custom' && (
          <div className="custom-date-range">
            <input
              type="date"
              value={filters.dateFilter.from || ''}
              onChange={(e) => updateDateFilter('from', e.target.value)}
              placeholder="From"
            />
            <span>to</span>
            <input
              type="date"
              value={filters.dateFilter.to || ''}
              onChange={(e) => updateDateFilter('to', e.target.value)}
              placeholder="To"
            />
          </div>
        )}

        {filters.dateFilter.type !== 'all' && (
          <div className="date-preview">
            Selected: {filters.dateFilter.from} → {filters.dateFilter.to}
          </div>
        )}
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
