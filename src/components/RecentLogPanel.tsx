type RecentLogPanelProps = {
  entries: readonly string[];
};

export function RecentLogPanel({ entries }: RecentLogPanelProps) {
  return (
    <details className="log-panel">
      <summary>
        <div>
          <p className="eyebrow">Table log</p>
          <h2>Show Recent Actions</h2>
        </div>
        <span>{entries.length} actions</span>
      </summary>
      <ol>
        {entries.slice(0, 12).map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ol>
    </details>
  );
}
