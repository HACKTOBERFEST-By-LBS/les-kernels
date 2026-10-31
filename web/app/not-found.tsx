import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-12 sm:px-6">
      <span className="rounded-md bg-danger-soft px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-danger">
        Erreur 404 : Adresse introuvable
      </span>
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Cette page n&apos;existe pas sur Alerte Marché
      </h1>
      <p className="max-w-xl text-base leading-relaxed text-muted">
        Le lien que vous avez suivi est incomplet ou n&apos;existe plus. Choisissez ci-dessous où vous souhaitez aller.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg bg-danger px-5 py-2.5 text-sm font-extrabold text-white hover:opacity-95"
        >
          Vérifier un SMS suspect
        </Link>
        <Link
          href="/numeros"
          className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-5 py-2.5 text-sm font-bold text-foreground hover:border-foreground"
        >
          Consulter les numéros signalés
        </Link>
      </div>
    </main>
  );
}
