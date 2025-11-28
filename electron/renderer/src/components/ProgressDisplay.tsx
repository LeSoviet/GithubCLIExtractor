interface ProgressDisplayProps {
  progress: {
    stage: string;
    progress: number;
    current?: number;
    total?: number;
    currentRepo?: string;
    itemsProcessed?: number;
    totalItems?: number;
  };
}

function ProgressDisplay({ progress }: ProgressDisplayProps) {
  return (
    <div className="progress-display">
      <h3>Export Progress</h3>
      <div className="progress-info">
        <p>
          <strong>Status:</strong> {progress.stage}
        </p>
        {progress.currentRepo && (
          <p>
            <strong>Current Repository:</strong> {progress.currentRepo}
          </p>
        )}
        {progress.current !== undefined && progress.total !== undefined && (
          <p>
            <strong>Repositories:</strong> {progress.current} / {progress.total}
          </p>
        )}
        {progress.itemsProcessed !== undefined && progress.totalItems !== undefined && (
          <p>
            <strong>Items:</strong> {progress.itemsProcessed} / {progress.totalItems}
          </p>
        )}
      </div>
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress.progress))}%` }}
        />
      </div>
      <p className="progress-percentage">{Math.round(progress.progress)}%</p>
    </div>
  );
}

export default ProgressDisplay;
