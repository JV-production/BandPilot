"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={value} className="input min-w-0 flex-1 font-mono text-xs" onFocus={(e) => e.target.select()} />
      <button
        type="button"
        className="btn-secondary w-12 shrink-0 px-0"
        aria-label="Kopírovat"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
