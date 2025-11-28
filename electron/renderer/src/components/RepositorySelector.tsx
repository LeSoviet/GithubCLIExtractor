import { useState } from 'react';

interface RepositorySelectorProps {
  repositories: Array<{ owner: string; name: string; fullName: string }>;
  selectedRepos: Array<{ owner: string; name: string; fullName: string }>;
  onSelectRepos: (repos: Array<{ owner: string; name: string; fullName: string }>) => void;
  loading: boolean;
  onRefresh: () => void;
}

function RepositorySelector({
  repositories,
  selectedRepos,
  onSelectRepos,
  loading,
  onRefresh,
}: RepositorySelectorProps) {
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleSelectRepo = (fullName: string) => {
    const repo = repositories.find((r) => r.fullName === fullName);
    if (repo && !selectedRepos.find((r) => r.fullName === fullName)) {
      onSelectRepos([...selectedRepos, repo]);
    }
  };

  const handleAddManualRepo = () => {
    let trimmed = manualInput.trim();
    if (!trimmed) return;

    // Extract owner/repo from GitHub URL if provided
    if (trimmed.includes('github.com/')) {
      const match = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        trimmed = `${match[1]}/${match[2]}`;
        // Remove .git extension if present
        trimmed = trimmed.replace(/\.git$/, '');
      }
    }

    const parts = trimmed.split('/');
    if (parts.length !== 2) {
      alert('Invalid format. Please use: owner/repository or https://github.com/owner/repository');
      return;
    }

    const [owner, name] = parts;
    const repo = { owner, name, fullName: trimmed };

    if (selectedRepos.find((r) => r.fullName === trimmed)) {
      alert('Repository already added');
      return;
    }

    onSelectRepos([...selectedRepos, repo]);
    setManualInput('');
    setShowManualInput(false);
  };

  const handleRemoveRepo = (fullName: string) => {
    onSelectRepos(selectedRepos.filter((r) => r.fullName !== fullName));
  };

  return (
    <div className="repository-selector">
      <div className="selector-header">
        <select
          className="repo-select"
          value=""
          onChange={(e) => handleSelectRepo(e.target.value)}
          disabled={loading}
        >
          <option value="">Select from your repositories...</option>
          {repositories.map((repo) => (
            <option key={repo.fullName} value={repo.fullName}>
              {repo.fullName}
            </option>
          ))}
        </select>
        <button className="btn-refresh" onClick={onRefresh} disabled={loading}>
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
        <button className="btn-add-repo" onClick={() => setShowManualInput(!showManualInput)}>
          {showManualInput ? '✖ Cancel' : '🌐 Add Public Repository'}
        </button>
      </div>

      {showManualInput && (
        <div className="manual-repo-input">
          <input
            type="text"
            placeholder="redis/redis or https://github.com/redis/redis"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddManualRepo()}
          />
          <button className="btn-add-repo" onClick={handleAddManualRepo}>
            Add
          </button>
        </div>
      )}

      {showManualInput && (
        <div className="filter-info" style={{ marginTop: '0.5rem' }}>
          💡 <strong>Tip:</strong> You can add any public GitHub repository by entering the
          owner/repo name or pasting the full GitHub URL
        </div>
      )}

      {selectedRepos.length > 0 && (
        <div className="selected-repos-list">
          {selectedRepos.map((repo) => (
            <div key={repo.fullName} className="repo-tag">
              <span>{repo.fullName}</span>
              <button onClick={() => handleRemoveRepo(repo.fullName)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RepositorySelector;
