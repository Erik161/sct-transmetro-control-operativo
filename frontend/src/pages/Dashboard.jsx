import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Bus, CalendarClock, Map, MapPin, RefreshCw, Route, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const tones = {
  emerald: 'bg-emerald-50 text-emerald-700',
  sky: 'bg-sky-50 text-sky-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-700'
};

export default function Dashboard() {
  const { usuario } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargarDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/dashboard');
      setData(response.data);
    } catch {
      setError('No se pudo actualizar el resumen operativo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDashboard();
  }, [cargarDashboard]);

  if (usuario.rol === 'Piloto') {
    return <PilotoDashboard usuario={usuario} data={data} loading={loading} error={error} reload={cargarDashboard} />;
  }

  if (usuario.rol === 'Operador') {
    return <OperadorDashboard usuario={usuario} data={data} loading={loading} error={error} reload={cargarDashboard} />;
  }

  if (usuario.rol === 'Supervisor') {
    return <SupervisorDashboard usuario={usuario} data={data} loading={loading} error={error} reload={cargarDashboard} />;
  }

  return <AdminDashboard usuario={usuario} data={data} loading={loading} error={error} reload={cargarDashboard} />;
}

function Header({ eyebrow, title, description, loading, reload }) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl bg-slate-900 px-6 py-6 text-white md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">{description}</p>
      </div>
      <button onClick={reload} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-60">
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar datos
      </button>
    </header>
  );
}

function AdminDashboard({ usuario, data, loading, error, reload }) {
  const alertasTotal = useMemo(() => (data?.alertas_ultimos_7_dias || []).reduce((total, alerta) => total + alerta.total, 0), [data]);
  const lineasConPendientes = useMemo(() => (data?.estado_lineas || []).filter((linea) => !linea.cumple_asignacion_buses).length, [data]);
  const cards = [
    { label: 'Lineas registradas', value: data?.lineas ?? 0, helper: `${lineasConPendientes} requieren revision`, icon: Route, tone: 'emerald' },
    { label: 'Estaciones', value: data?.estaciones ?? 0, helper: `${data?.municipalidades ?? 0} municipalidades`, icon: MapPin, tone: 'sky' },
    { label: 'Buses registrados', value: data?.buses ?? 0, helper: `${data?.recorridos_hoy ?? 0} recorridos creados hoy`, icon: Bus, tone: 'amber' },
    { label: 'Alertas recientes', value: alertasTotal, helper: 'Generadas en los ultimos 7 dias', icon: AlertTriangle, tone: alertasTotal > 0 ? 'rose' : 'slate' }
  ];

  return (
    <section className="space-y-6">
      <Header eyebrow="Administracion de red" title={`Bienvenido, ${usuario.nombre}`} description="Gestiona catalogos, personal y asignaciones operativas desde una vista general de la red." loading={loading} reload={reload} />
      {error && <ErrorMessage text={error} />}
      <Cards items={cards} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Prioridades de operacion</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <PriorityCard icon={ShieldCheck} label="Cobertura de accesos" value={`${data?.accesos_sin_cobertura ?? 0} pendientes`} helper={`${data?.total_accesos ?? 0} accesos registrados`} urgent={(data?.accesos_sin_cobertura ?? 0) > 0} to="/estaciones" />
            <PriorityCard icon={Route} label="Asignacion por linea" value={`${lineasConPendientes} pendientes`} helper="Regla de buses segun estaciones" urgent={lineasConPendientes > 0} to="/lineas" />
            <PriorityCard icon={CalendarClock} label="Jornada actual" value={`${data?.recorridos_hoy ?? 0} recorridos`} helper="Registrados durante el dia" to="/buses" />
          </div>
        </article>
        <GpsCard />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <AlertList alertas={data?.alertas_recientes || []} />
        <TeamList items={data?.empleados_por_cargo || []} />
      </div>
    </section>
  );
}

function SupervisorDashboard({ usuario, data, loading, error, reload }) {
  const alertasTotal = useMemo(() => (data?.alertas_ultimos_7_dias || []).reduce((total, alerta) => total + alerta.total, 0), [data]);
  const lineasConPendientes = useMemo(() => (data?.estado_lineas || []).filter((linea) => !linea.cumple_asignacion_buses).length, [data]);
  return (
    <section className="space-y-6">
      <Header eyebrow="Supervision operativa" title={`Panel de ${usuario.nombre}`} description="Consulta el estado de la red, identifica pendientes y revisa alertas sin modificar la configuracion." loading={loading} reload={reload} />
      {error && <ErrorMessage text={error} />}
      <Cards items={[
        { label: 'Lineas supervisadas', value: data?.lineas ?? 0, helper: `${lineasConPendientes} con asignacion pendiente`, icon: Route, tone: lineasConPendientes > 0 ? 'amber' : 'emerald' },
        { label: 'Estaciones de la red', value: data?.estaciones ?? 0, helper: `${data?.total_accesos ?? 0} accesos registrados`, icon: MapPin, tone: 'sky' },
        { label: 'Accesos sin cobertura', value: data?.accesos_sin_cobertura ?? 0, helper: 'Requieren asignacion de guardia', icon: ShieldCheck, tone: (data?.accesos_sin_cobertura ?? 0) > 0 ? 'rose' : 'emerald' },
        { label: 'Alertas recientes', value: alertasTotal, helper: 'Generadas en los ultimos 7 dias', icon: AlertTriangle, tone: alertasTotal > 0 ? 'rose' : 'slate' }
      ]} />
      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <LineStatus items={data?.estado_lineas || []} />
        <GpsCard />
      </div>
      <AlertList alertas={data?.alertas_recientes || []} />
    </section>
  );
}

function OperadorDashboard({ usuario, data, loading, error, reload }) {
  const alertasTotal = (data?.alertas_ultimos_7_dias || []).reduce((total, alerta) => total + alerta.total, 0);
  return (
    <section className="space-y-6">
      <Header eyebrow="Puesto de operacion" title={`Jornada de ${usuario.nombre}`} description="Registra el flujo de pasajeros y atiende las alertas generadas durante los recorridos." loading={loading} reload={reload} />
      {error && <ErrorMessage text={error} />}
      <Cards items={[
        { label: 'Mis recorridos de hoy', value: data?.recorridos_hoy ?? 0, helper: 'Registrados durante la jornada', icon: Bus, tone: 'emerald' },
        { label: 'Mis alertas recientes', value: alertasTotal, helper: 'Generadas en los ultimos 7 dias', icon: AlertTriangle, tone: alertasTotal > 0 ? 'rose' : 'slate' }
      ]} />
      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <AlertList alertas={data?.alertas_recientes || []} />
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Captura operativa</h3>
          <p className="mt-2 text-sm text-slate-500">Evalua pasajeros en espera y ocupacion para generar alertas cuando corresponda.</p>
          <Link to="/operacion" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Registrar capacidad <ArrowRight size={16} /></Link>
        </article>
      </div>
    </section>
  );
}

function PilotoDashboard({ usuario, data, loading, error, reload }) {
  const unidad = data?.unidad;
  const estaciones = data?.estaciones || [];
  return (
    <section className="space-y-6">
      <Header eyebrow="Informacion de recorrido" title={`Ruta de ${usuario.nombre}`} description="Consulta la unidad, los horarios y las estaciones asignadas para tu jornada." loading={loading} reload={reload} />
      {error && <ErrorMessage text={error} />}
      <Cards items={[
        { label: 'Unidad asignada', value: unidad ? `#${unidad.num_unidad}` : '-', helper: unidad?.placa || 'Sin unidad asignada', icon: Bus, tone: 'emerald' },
        { label: 'Linea asignada', value: unidad?.codigo_linea || '-', helper: unidad?.linea || 'Sin linea asignada', icon: Route, tone: 'sky' },
        { label: 'Estaciones', value: estaciones.length, helper: 'Puntos del recorrido asignado', icon: MapPin, tone: 'amber' },
        { label: 'Capacidad maxima', value: unidad?.capacidad_maxima || '-', helper: 'Pasajeros por unidad', icon: Users, tone: 'slate' }
      ]} />
      {unidad && (
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Detalle de jornada</h3>
          <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
            <InfoItem label="Horarios" value={unidad.horarios || 'Horario no registrado'} />
            <InfoItem label="Parqueo asignado" value={unidad.parqueo} />
            <InfoItem label="Distancia de linea" value={`${unidad.distancia_total || 0} km`} />
          </div>
        </article>
      )}
      <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Estaciones del recorrido</h3>
          <p className="mt-1 text-xs text-slate-500">Secuencia correspondiente a la linea asignada.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {estaciones.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">No tienes una ruta asignada.</p>}
          {estaciones.map((item) => (
            <div key={item.id_estacion} className="flex gap-3 px-5 py-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700">{item.orden}</span>
              <div>
                <p className="font-medium text-slate-900">{item.nombre}</p>
                <p className="mt-1 text-sm text-slate-600">{item.ubicacion}</p>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function InfoItem({ label, value }) {
  return <div className="rounded-lg bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-medium text-slate-800">{value}</p></div>;
}

function Cards({ items }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{items.map(({ label, value, helper, icon: Icon, tone }) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`inline-flex rounded-lg p-2 ${tones[tone]}`}><Icon size={19} /></div><p className="mt-4 text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-500">{helper}</p></article>)}</div>;
}

function AlertList({ alertas }) {
  return <article className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h3 className="font-semibold text-slate-900">Alertas de capacidad</h3><p className="mt-1 text-xs text-slate-500">Ultimos eventos generados durante la operacion.</p></div><div className="divide-y divide-slate-100">{alertas.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">No hay alertas registradas.</p>}{alertas.map((alerta) => <div key={alerta.id_alerta} className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${alerta.tipo === 'sobredemanda' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{alerta.tipo === 'sobredemanda' ? 'Sobredemanda' : 'Baja ocupacion'}</span><p className="mt-2 text-sm text-slate-700">{alerta.descripcion}</p><p className="mt-2 text-xs text-slate-400">{alerta.linea} · {alerta.estacion}</p></div>)}</div></article>;
}

function TeamList({ items }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-slate-900">Equipo registrado</h3><div className="mt-4 space-y-3">{items.map((item) => <div key={item.cargo} className="flex justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm"><span>{item.cargo}</span><strong>{item.total}</strong></div>)}</div></article>;
}

function LineStatus({ items }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-semibold text-slate-900">Cumplimiento por linea</h3><div className="mt-4 space-y-3">{items.map((item) => <div key={item.id_linea} className="flex justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm"><span>{item.codigo}</span><strong className={item.cumple_asignacion_buses ? 'text-emerald-700' : 'text-rose-700'}>{item.cumple_asignacion_buses ? 'Cumple' : 'Pendiente'}</strong></div>)}</div></article>;
}

function GpsCard() {
  return <Link to="/mapa-gps" className="rounded-xl bg-gradient-to-br from-emerald-700 to-slate-900 p-5 text-white shadow-sm transition hover:from-emerald-600 hover:to-slate-800"><Map size={23} /><h3 className="mt-4 text-xl font-semibold">Mapa GPS</h3><p className="mt-3 text-sm text-emerald-50">Consulta lineas, estaciones y recorridos de la red.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white">Abrir mapa <ArrowRight size={16} /></span></Link>;
}

function PriorityCard({ icon: Icon, label, value, helper, urgent = false, to }) {
  return <Link to={to} className="rounded-lg border border-slate-200 p-4 transition hover:border-emerald-300"><Icon size={18} className={urgent ? 'text-rose-600' : 'text-emerald-600'} /><p className="mt-4 text-xs uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-lg font-semibold ${urgent ? 'text-rose-700' : 'text-slate-900'}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{helper}</p></Link>;
}

function ErrorMessage({ text }) {
  return <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{text}</p>;
}
