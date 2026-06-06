"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  start: string;
  end: string;
  status: string;
}

interface WaitlistEntry {
  id: string;
  clientId: string;
  serviceId: string;
  windowStart: string;
  windowEnd: string;
  createdAt: string;
}

interface Notification {
  id: string;
  clientId: string;
  kind: string;
  body: string;
  createdAt: string;
}

interface StatsBundle {
  rangeStart: string;
  rangeEnd: string;
  appointmentsTotal: number;
  appointmentsBooked: number;
  appointmentsCompleted: number;
  appointmentsCancelled: number;
  cancellationRate: number;
  occupancyRate: number;
  topServicesByBookings: { serviceId: string; count: number }[];
  topServicesByCancellations: { serviceId: string; count: number }[];
  topClientsByVisits: { clientId: string; count: number }[];
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<StatsBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeOffset, setTimeOffset] = useState(0); // hours to advance

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [apptsRes, waitRes, notifRes, statsRes] = await Promise.all([
        fetch("/api/appointments"),
        fetch("/api/waitlist"),
        fetch("/api/notifications"),
        fetch("/api/stats"),
      ]);

      if (apptsRes.ok) setAppointments(await apptsRes.json());
      if (waitRes.ok) setWaitlist(await waitRes.json());
      if (notifRes.ok) setNotifications(await notifRes.json());
      if (statsRes.ok) setStats(await statsRes.json().then((j) => j.stats));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchData();
    };
    loadData();

    const interval = setInterval(() => {
      fetchData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (appointmentId: string) => {
    if (!confirm("¿Cancelar esta cita? El hueco se ofrecerá al primer cliente en lista de espera.")) return;

    try {
      const response = await fetch(`/api/appointments/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });

      if (response.ok) {
        alert("Cita cancelada. Se ha ofrecido el hueco al primer cliente en lista de espera.");
        fetchData(); // Refresh all data
      } else {
        alert("Error al cancelar la cita");
      }
    } catch (error) {
      console.error("Cancel error:", error);
      alert("Error al cancelar la cita");
    }
  };

  const handleAdvanceTime = async () => {
    try {
      const response = await fetch("/api/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: timeOffset }),
      });

      if (response.ok) {
        alert(`Tiempo avanzado ${timeOffset} horas. Los recordatorios se han actualizado.`);
        fetchData(); // Refresh data
      } else {
        alert("Error al avanzar tiempo");
      }
    } catch (error) {
      console.error("Advance time error:", error);
      alert("Error al avanzar tiempo");
    }
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getServiceName = (serviceId: string) => {
    switch (serviceId) {
      case "svc-bano": return "Baño completo";
      case "svc-corte": return "Corte y peinado";
      case "svc-spa": return "Spa de mascotas";
      default: return serviceId;
    }
  };

  const getClientName = (clientId: string) => {
    switch (clientId) {
      case "cli-ana": return "Ana Pérez";
      case "cli-bob": return "Roberto Díaz";
      default: return clientId;
    }
  };

  const getNotificationIcon = (kind: string) => {
    switch (kind) {
      case "confirmation": return "✅";
      case "upsell": return "💰";
      case "backfill_offer": return "🔄";
      case "reminder": return "🔔";
      default: return "📢";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-lg font-semibold tracking-tight hover:underline">
              🐾 PetDesk
            </Link>
            <span className="text-sm text-zinc-500">/ Panel de groomer</span>
          </div>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/" className="rounded-md px-3 py-1.5 text-zinc-700 hover:bg-zinc-100">
              Inicio
            </Link>
            <Link href="/chat" className="rounded-md px-3 py-1.5 text-zinc-700 hover:bg-zinc-100">
              Chat
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Panel de groomer</h1>
          <p className="mt-2 text-zinc-500">Gestiona citas, lista de espera y notificaciones en tiempo real.</p>
        </div>

        {/* Time control */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">⏰ Control de tiempo (demo)</h2>
          <p className="mt-1 text-sm text-zinc-500">Avanza el tiempo para simular recordatorios vencidos.</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-zinc-700">Horas a avanzar</label>
              <input
                type="range"
                min="0"
                max="48"
                value={timeOffset}
                onChange={(e) => setTimeOffset(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200"
              />
              <div className="mt-1 flex justify-between text-xs text-zinc-500">
                <span>0h</span>
                <span className="font-medium">{timeOffset}h</span>
                <span>48h</span>
              </div>
            </div>
            <button
              onClick={handleAdvanceTime}
              className="self-end rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Avanzar tiempo
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900"></div>
            <p className="mt-3 text-zinc-500">Cargando datos...</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left column: Appointments & Waitlist */}
            <div className="space-y-8">
              {/* Appointments */}
              <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">📅 Citas del día</h2>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium">
                    {appointments.filter((a) => a.status === "booked").length} activas
                  </span>
                </div>
                {appointments.filter((a) => a.status === "booked").length === 0 ? (
                  <p className="mt-4 text-center text-zinc-500">No hay citas programadas para hoy.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {appointments
                      .filter((a) => a.status === "booked")
                      .map((appt) => (
                        <div
                          key={appt.id}
                          className="rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">{getServiceName(appt.serviceId)}</div>
                              <div className="mt-1 text-sm text-zinc-600">
                                Cliente: {getClientName(appt.clientId)}
                              </div>
                              <div className="mt-1 text-sm text-zinc-600">
                                {formatDate(appt.start)} – {formatDate(appt.end).split(" ").pop()}
                              </div>
                            </div>
                            <button
                              onClick={() => handleCancel(appt.id)}
                              className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </section>

              {/* Waitlist */}
              <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">⏳ Lista de espera (FIFO)</h2>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium">
                    {waitlist.length} clientes
                  </span>
                </div>
                {waitlist.length === 0 ? (
                  <p className="mt-4 text-center text-zinc-500">La lista de espera está vacía.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {waitlist.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{getClientName(entry.clientId)}</div>
                              <div className="mt-1 text-sm text-zinc-600">
                                Servicio: {getServiceName(entry.serviceId)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm text-zinc-500">
                            <div>Ventana:</div>
                            <div>{formatDate(entry.windowStart)}</div>
                            <div>a {formatDate(entry.windowEnd).split(" ").pop()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Right column: Notifications */}
            <div>
              <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">📢 Feed de notificaciones</h2>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium">
                    {notifications.length} notificaciones
                  </span>
                </div>
                {notifications.length === 0 ? (
                  <p className="mt-4 text-center text-zinc-500">No hay notificaciones.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`rounded-lg border p-4 ${notif.kind === "backfill_offer" ? "border-green-300 bg-green-50" : "border-zinc-200 bg-white"} hover:bg-zinc-50`}
                      >
                        <div className="flex gap-3">
                          <div className="text-xl">{getNotificationIcon(notif.kind)}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">
                                {notif.kind === "confirmation" && "Confirmación de cita"}
                                {notif.kind === "upsell" && "Oferta de upsell"}
                                {notif.kind === "backfill_offer" && "¡Oferta de backfill!"}
                                {notif.kind === "reminder" && "Recordatorio"}
                              </div>
                              <span className="text-xs text-zinc-500">{formatDate(notif.createdAt)}</span>
                            </div>
                            <div className="mt-2 text-sm text-zinc-700">{notif.body}</div>
                            <div className="mt-2 text-xs text-zinc-500">
                              Cliente: {getClientName(notif.clientId)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Stats */}
              <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">📊 Estadísticas</h2>
                  <span className="text-xs text-zinc-500">Últimos 30 días</span>
                </div>
                {stats ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg border border-zinc-200 p-4 text-center">
                        <div className="text-2xl font-semibold">{stats.appointmentsTotal}</div>
                        <div className="mt-1 text-xs text-zinc-600">Total citas</div>
                      </div>
                      <div className="rounded-lg border border-zinc-200 p-4 text-center">
                        <div className="text-2xl font-semibold">{(stats.cancellationRate * 100).toFixed(1)}%</div>
                        <div className="mt-1 text-xs text-zinc-600">Cancelación</div>
                      </div>
                      <div className="rounded-lg border border-zinc-200 p-4 text-center">
                        <div className="text-2xl font-semibold">{(stats.occupancyRate * 100).toFixed(1)}%</div>
                        <div className="mt-1 text-xs text-zinc-600">Ocupación</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-zinc-700">Top servicios por reservas</h3>
                      {stats.topServicesByBookings.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-500">Sin datos</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {stats.topServicesByBookings.slice(0, 3).map((s, i) => (
                            <div key={s.serviceId} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white">
                                  {i + 1}
                                </span>
                                <span className="text-sm">{getServiceName(s.serviceId)}</span>
                              </div>
                              <span className="text-sm font-medium">{s.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-center text-zinc-500">Cargando estadísticas...</p>
                )}
              </section>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">💡 Cómo funciona el backfill</h2>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-zinc-600">
            <li>Cuando un cliente cancela una cita, el hueco se libera</li>
            <li>El sistema busca en la lista de espera (FIFO) clientes con el mismo servicio y ventana compatible</li>
            <li>Se notifica automáticamente al primer cliente disponible</li>
            <li>Si acepta, se agienda en el hueco liberado</li>
            <li>¡Tu agenda se mantiene llena incluso con cancelaciones!</li>
          </ol>
          <div className="mt-4">
            <button
              onClick={() => {
                const booked = appointments.filter((a) => a.status === "booked");
                if (booked.length > 0) {
                  handleCancel(booked[0].id);
                } else {
                  alert("No hay citas para cancelar. Primero agenda una desde el chat.");
                }
              }}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Probar cancelación + backfill
            </button>
            <p className="mt-2 text-xs text-zinc-500">
              Cancela una cita para ver el backfill en acción.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}