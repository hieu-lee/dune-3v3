type RecentLogPanelProps = {
  entries: readonly string[];
};

export function RecentLogPanel({ entries }: RecentLogPanelProps) {
  return (
    <div className="log-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Table log</p>
          <h2>Recent Actions</h2>
        </div>
      </div>
      <ol>
        {entries.slice(0, 5).map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ol>
    </div>
  );
}
