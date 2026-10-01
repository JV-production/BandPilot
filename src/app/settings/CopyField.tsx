"use client";

import { useState } from "react";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={value} className="input flex-1 font-mono text-xs" onFocus={(e) => e.target.select()} />
      <button
        type="button"
        className="btn-secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "✓" : "Kopírovat"}
      </button>
    </div>
  );
}
