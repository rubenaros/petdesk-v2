import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">🐾 PetDesk</span>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/chat" className="rounded-md px-3 py-1.5 text-zinc-700 hover:bg-zinc-100">Chat</Link>
            <Link href="/dashboard" className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center">
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            El recepcionista que tu grooming necesita
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-500">
            PetDesk agenda citas automáticamente, envía recordatorios y llena los huecos de cancelaciones sin que tú levantes un dedo.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/chat"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Probar chat de reservas
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              Ver panel
            </Link>
          </div>
        </section>

        {/* Beneficios */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-3 text-2xl">📅</div>
              <h3 className="text-base font-semibold">Agenda 24/7</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Tus clientes reservan a cualquier hora por chat. Sin llamadas perdidas, sin horarios de atención.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-3 text-2xl">🔔</div>
              <h3 className="text-base font-semibold">Recordatorios automáticos</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Se programan 24 h antes de cada cita. Reduce ausencias y mantén tu agenda al día.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-3 text-2xl">🔄</div>
              <h3 className="text-base font-semibold">Backfill de cancelaciones</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Cuando alguien cancela, PetDesk busca en tu lista de espera y ofrece el hueco al primer cliente disponible.
              </p>
            </div>
          </div>
        </section>

        {/* Llamada a la acción */}
        <section className="mx-auto max-w-5xl px-6 pb-24 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Empieza gratis hoy</h2>
          <p className="mt-3 text-zinc-500">Explora el chat y el dashboard para ver cómo funciona.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/chat" className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800">
              Ir al chat
            </Link>
            <Link href="/dashboard" className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
              Abrir panel
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
