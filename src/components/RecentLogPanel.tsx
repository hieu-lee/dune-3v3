type RecentLogPanelProps = {
  entries: readonly string[];
  variant?: "details" | "drawer";
};

export function RecentLogPanel({ entries, variant = "details" }: RecentLogPanelProps) {
  if (variant === "drawer") {
    return (
      <section className="log-panel log-panel-drawer-content">
        <header>
          <div>
            <p className="eyebrow">Table log</p>
            <h2>Actions</h2>
          </div>
          <span>{entries.length} actions</span>
        </header>
        <ol>
          {entries.map((entry, index) => (
            <li key={`${entry}-${index}`}>{entry}</li>
          ))}
        </ol>
      </section>
    );
  }

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
