"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function SubmitButton({
  children,
  className = "btn-primary",
  confirm,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const { pending, data } = useFormStatus();
  // Při více tlačítkách v jednom formuláři točí jen to, které bylo stisknuto.
  const mine = pending && (!name || data?.get(name) === value);
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {mine ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}
