import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-[#f3ecdf]/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          Alerte Marché
        </Link>
        <nav className="flex gap-5 text-sm font-medium">
          <Link href="/" className="hover:text-danger">
            Scanner
          </Link>
          <Link href="/numeros" className="hover:text-danger">
            Numéros
          </Link>
          <Link href="/admin" className="hover:text-danger">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
