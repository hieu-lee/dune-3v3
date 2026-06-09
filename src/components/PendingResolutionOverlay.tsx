import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

type PendingResolutionOverlayProps = {
  active: boolean;
  children: ReactNode;
  resetKey: string;
};

export function PendingResolutionOverlay({ active, children, resetKey }: PendingResolutionOverlayProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (active) setHidden(false);
  }, [active, resetKey]);

  if (!active) return null;

  if (hidden) {
    return (
      <button
        type="button"
        className="pending-resolution-reveal"
        aria-label="Show pending resolution"
        onClick={() => setHidden(false)}
      >
        <Eye size={16} />
        <span>Show resolution</span>
      </button>
    );
  }

  return (
    <section className="pending-resolution-overlay" aria-label="Pending resolution">
      <div className="pending-resolution-scrim" />
      <div className="pending-resolution-shell">
        <div className="pending-resolution-toolbar">
          <button
            type="button"
            className="pending-resolution-toggle"
            aria-label="Hide pending resolution"
            onClick={() => setHidden(true)}
          >
            <EyeOff size={16} />
            <span>Hide</span>
          </button>
        </div>
        <div className="pending-resolution-body">
          {children}
        </div>
      </div>
    </section>
  );
}
