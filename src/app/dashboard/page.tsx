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
  topServicesByBookings: Array<{ serviceId: string; count: number }>;
  topServicesByCancellations: Array<{ serviceId: string; count: number }>;
  topClientsByVisits: Array<{ clientId: string; count: number }>;
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
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Wrap in async function to avoid calling setState directly
    const loadData = async () => {
      await fetchData();
    };
    loadData();
    
    // Polling cada 5 segundos para actualizar estadísticas
    const intervalId = setInterval(() => {
      fetchData();
    }, 5000);
    
    return () => clearInterval(intervalId);
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

        {/* Stats section */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">📊 Estadísticas</h2>
            {stats && (
              <span className="text-sm text-zinc-500">
                {formatDate(stats.rangeStart)} – {formatDate(stats.rangeEnd)}
              </span>
            )}
          </div>
          
          {stats ? (
            <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-3">
              {/* Total citas */}
              <div className="rounded-xl border border-zinc-200 p-5">
                <div className="text-3xl font-semibold">{stats.appointmentsTotal}</div>
                <div className="mt-1 text-sm text-zinc-600">Total citas</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded bg-green-50 p-2 text-center text-green-700">
                    <div className="font-medium">{stats.appointmentsBooked}</div>
                    <div>Activas</div>
                  </div>
                  <div className="rounded bg-blue-50 p-2 text-center text-blue-700">
                    <div className="font-medium">{stats.appointmentsCompleted}</div>
                    <div>Completadas</div>
                  </div>
                  <div className="rounded bg-red-50 p-2 text-center text-red-700">
                    <div className="font-medium">{stats.appointmentsCancelled}</div>
                    <div>Canceladas</div>
                  </div>
                </div>
              </div>
              
              {/* Tasas */}
              <div className="rounded-xl border border-zinc-200 p-5">
                <div className="text-3xl font-semibold">{(stats.cancellationRate * 100).toFixed(1)}%</div>
                <div className="mt-1 text-sm text-zinc-600">Tasa de cancelación</div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Ocupancia</span>
                    <span className="font-medium">{(stats.occupancyRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-zinc-200">
                    <div 
                      className="h-full rounded-full bg-green-500" 
                      style={{ width: `${Math.min(stats.occupancyRate * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Top servicios por reservas */}
              <div className="rounded-xl border border-zinc-200 p-5">
                <h3 className="text-sm font-semibold text-zinc-700">Top servicios por reservas</h3>
                <div className="mt-3 space-y-2">
                  {stats.topServicesByBookings.slice(0, 3).map((service, idx) => (
                    <div key={service.serviceId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs text-white">
                          {idx + 1}
                        </div>
                        <span>{getServiceName(service.serviceId)}</span>
                      </div>
                      <span className="font-medium">{service.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Top servicios por cancelaciones */}
              <div className="rounded-xl border border-zinc-200 p-5">
                <h3 className="text-sm font-semibold text-zinc-700">Top servicios por cancelaciones</h3>
                <div className="mt-3 space-y-2">
                  {stats.topServicesByCancellations.slice(0, 3).map((service, idx) => (
                    <div key={service.serviceId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs text-white">
                          {idx + 1}
                        </div>
                        <span>{getServiceName(service.serviceId)}</span>
                      </div>
                      <span className="font-medium">{service.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Top clientes */}
              <div className="rounded-xl border border-zinc-200 p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold text-zinc-700">Top clientes por visitas</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {stats.topClientsByVisits.slice(0, 3).map((client, idx) => (
                    <div key={client.clientId} className="rounded-lg border border-zinc-200 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium">{getClientName(client.clientId)}</div>
                          <div className="text-sm text-zinc-600">{client.count} visita{client.count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900"></div>
              <p className="mt-3 text-zinc-500">Cargando estadísticas...</p>
            </div>
          )}
          
          <div className="mt-6 border-t border-zinc-200 pt-6">
            <p className="text-sm text-zinc-500">
              Las estadísticas se actualizan automáticamente cada 5 segundos.
            </p>
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
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center">
                  <div className="text-2xl font-semibold">
                    {appointments.filter((a) => a.status === "booked").length}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">Citas activas</div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center">
                  <div className="text-2xl font-semibold">
                    {appointments.filter((a) => a.status === "cancelled").length}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">Canceladas</div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center">
                  <div className="text-2xl font-semibold">{waitlist.length}</div>
                  <div className="mt-1 text-sm text-zinc-600">En lista de espera</div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center">
                  <div className="text-2xl font-semibold">
                    {notifications.filter((n) => n.kind === "backfill_offer").length}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">Ofertas de backfill</div>
                </div>
              </div>
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