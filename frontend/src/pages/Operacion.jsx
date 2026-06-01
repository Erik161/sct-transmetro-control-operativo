import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bus, CheckCircle2, Info, MapPin, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api.js';

const initialForm = {
  id_recorrido: '',
  id_estacion: '',
  pasajeros_espera: '',
  pasajeros_bus: ''
};

export default function Operacion() {
  const [form, setForm] = useState(initialForm);
  const [recorridos, setRecorridos] = useState([]);
  const [estaciones, setEstaciones] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingEstaciones, setLoadingEstaciones] = useState(false);

  useEffect(() => {
    api.get('/recorridos')
      .then((recorridosResponse) => {
        setRecorridos(recorridosResponse.data);
      })
      .catch(() => toast.error('No se pudieron cargar los recorridos disponibles.'))
      .finally(() => setLoading(false));
  }, []);

  const recorrido = useMemo(
    () => recorridos.find((item) => String(item.id_recorrido) === String(form.id_recorrido)),
    [form.id_recorrido, recorridos]
  );

  useEffect(() => {
    setForm((current) => ({ ...current, id_estacion: '' }));
    setEstaciones([]);
    if (!recorrido) return;

    setLoadingEstaciones(true);
    api.get(`/lineas/${recorrido.id_linea}`)
      .then((response) => setEstaciones(response.data.estaciones || []))
      .catch(() => toast.error('No se pudieron cargar las estaciones de la linea seleccionada.'))
      .finally(() => setLoadingEstaciones(false));
  }, [recorrido]);

  async function evaluar(event) {
    event.preventDefault();
    setResultado(null);
    try {
      const { data } = await api.post('/operacion/capacidad/evaluar', {
        ...form,
        pasajeros_espera: Number(form.pasajeros_espera),
        pasajeros_bus: Number(form.pasajeros_bus)
      });
      setResultado(data);
      toast.success('Control de capacidad evaluado');
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo evaluar la capacidad.');
    }
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Control de capacidad</h2>
        <p className="mt-1 text-sm text-slate-500">
          Evalua un bus durante su recorrido para decidir si debe solicitarse otra unidad o esperar antes de continuar.
        </p>
      </header>

      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <div className="flex gap-2">
          <Info className="mt-0.5 shrink-0" size={17} />
          <p>
            El sistema genera una alerta si las personas esperando superan el 50% de la capacidad del bus.
            Si la ocupacion del bus es menor al 25%, recomienda esperar 5 minutos adicionales.
          </p>
        </div>
      </div>

      <form onSubmit={evaluar} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-2">
          <SelectField
            label="Recorrido activo"
            helper="Selecciona el bus y la linea que estas evaluando."
            value={form.id_recorrido}
            onChange={(value) => setForm({ ...form, id_recorrido: value })}
            disabled={loading}
            options={recorridos.map((item) => ({
              value: item.id_recorrido,
              label: `Unidad #${item.num_unidad} · ${item.codigo_linea || item.linea} · ${formatDate(item.fecha)}`
            }))}
          />
          <SelectField
            label="Estacion evaluada"
            helper={recorrido ? `Solo se muestran las estaciones correspondientes a ${recorrido.linea}.` : 'Primero selecciona un recorrido activo.'}
            value={form.id_estacion}
            onChange={(value) => setForm({ ...form, id_estacion: value })}
            disabled={!recorrido || loadingEstaciones}
            options={estaciones.map((item) => ({ value: item.id_estacion, label: `${item.nombre} · ${item.ubicacion}` }))}
          />
        </div>

        {recorrido && (
          <div className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-3">
            <SummaryItem icon={Bus} label="Unidad" value={`#${recorrido.num_unidad} · ${recorrido.placa}`} />
            <SummaryItem icon={MapPin} label="Linea" value={recorrido.linea} />
            <SummaryItem icon={Users} label="Capacidad maxima" value={`${recorrido.capacidad_maxima} pasajeros`} />
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <NumberField
            label="Pasajeros esperando en la estacion"
            helper="Cantidad de personas que esperan abordar."
            value={form.pasajeros_espera}
            onChange={(value) => setForm({ ...form, pasajeros_espera: value })}
          />
          <NumberField
            label="Pasajeros dentro del bus"
            helper="Ocupacion actual de la unidad seleccionada."
            value={form.pasajeros_bus}
            onChange={(value) => setForm({ ...form, pasajeros_bus: value })}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
            Evaluar capacidad
          </button>
        </div>
      </form>

      {resultado && <ResultCard resultado={resultado} />}
    </section>
  );
}

function SelectField({ label, helper, options, value, onChange, disabled }) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} required className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-500">
        <option value="">Seleccione una opcion</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <span className="mt-1 block text-xs font-normal text-slate-500">{helper}</span>
    </label>
  );
}

function NumberField({ label, helper, value, onChange }) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input type="number" min="0" step="1" required value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500" />
      <span className="mt-1 block text-xs font-normal text-slate-500">{helper}</span>
    </label>
  );
}

function SummaryItem({ icon: Icon, label, value }) {
  return <div className="flex gap-3"><Icon className="mt-0.5 text-emerald-600" size={18} /><div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-medium text-slate-800">{value}</p></div></div>;
}

function ResultCard({ resultado }) {
  const hasAlerts = resultado.alertas.length > 0;
  return (
    <article className={`rounded-xl border p-5 shadow-sm ${hasAlerts ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <div className="flex gap-3">
        {hasAlerts ? <AlertTriangle className="text-amber-600" /> : <CheckCircle2 className="text-emerald-600" />}
        <div>
          <h3 className="font-semibold text-slate-900">{hasAlerts ? 'La operacion requiere atencion' : 'Operacion dentro de los parametros esperados'}</h3>
          <p className="mt-1 text-sm text-slate-600">Capacidad maxima de la unidad: {resultado.capacidad_bus} pasajeros.</p>
        </div>
      </div>
      {resultado.espera_adicional_minutos > 0 && <p className="mt-4 rounded-lg bg-white/70 px-4 py-3 text-sm text-amber-900">Accion recomendada: esperar {resultado.espera_adicional_minutos} minutos adicionales antes de continuar.</p>}
      {resultado.alertas.length > 0 && <div className="mt-4 space-y-2">{resultado.alertas.map((alerta) => <p key={alerta.id_alerta} className="rounded-lg bg-white/70 px-4 py-3 text-sm text-slate-700">{alerta.descripcion}</p>)}</div>}
    </article>
  );
}

function formatDate(value) {
  if (!value) return 'Fecha no disponible';
  const dateOnly = String(value).slice(0, 10);
  const date = new Date(`${dateOnly}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? 'Fecha no disponible'
    : new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium' }).format(date);
}
