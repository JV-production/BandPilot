import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md text-center">
      <div className="text-4xl">🔍</div>
      <h1 className="mt-2 text-xl font-bold">Stránka nenalezena</h1>
      <p className="mt-2 text-sm text-slate-600">Tato stránka neexistuje, nebo k ní nemáte přístup.</p>
      <Link href="/" className="btn-primary mt-4">
        Zpět na přehled
      </Link>
    </div>
  );
}
