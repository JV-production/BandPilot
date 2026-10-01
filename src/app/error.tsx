"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-md text-center">
      <div className="text-4xl">⚠️</div>
      <h1 className="mt-2 text-xl font-bold">Něco se nepovedlo</h1>
      <p className="mt-2 text-sm text-slate-600">{error.message || "Neočekávaná chyba."}</p>
      <button className="btn-primary mt-4" onClick={reset}>
        Zkusit znovu
      </button>
    </div>
  );
}
