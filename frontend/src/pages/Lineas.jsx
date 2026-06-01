import { useEffect, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import CrudPage from '../components/CrudPage.jsx';
import Badge from '../components/Badge.jsx';

function FleetRuleHeader() {
  return (
    <span className="whitespace-nowrap">Estado de flota</span>
  );
}

export default function Lineas() {
  const { usuario } = useAuth();
  const [municipalidades, setMunicipalidades] = useState([]);

  useEffect(() => {
    if (usuario.rol !== 'Administrador') return;
    api.get('/municipalidades').then(({ data }) => setMunicipalidades(data)).catch(() => setMunicipalidades([]));
  }, [usuario.rol]);

  return (
    <CrudPage
      title="Lineas"
      subtitle="Rutas del Transmetro con horarios, estaciones y regla operativa N-2N."
      notice={
        <details className="group rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
            <CircleHelp size={17} />
            ¿Como se calcula el estado de flota?
          </summary>
          <p className="mt-2 max-w-3xl leading-6 text-sky-800">
            Cada linea debe tener como minimo un bus por estacion y como maximo el doble. Por ejemplo, una linea con 9 estaciones necesita entre 9 y 18 buses asignados.
          </p>
        </details>
      }
      endpoint="/lineas"
      idKey="id_linea"
      fields={[
        { name: 'codigo', label: 'Codigo', required: true },
        { name: 'nombre', label: 'Nombre', required: true },
        { name: 'id_municipalidad', label: 'Municipalidad', type: 'select', required: true, defaultValue: 1, options: municipalidades.map((item) => ({ value: item.id_municipalidad, label: item.nombre })) },
        { name: 'fuente_url', label: 'URL fuente' }
      ]}
      normalize={(form) => ({ ...form, id_municipalidad: Number(form.id_municipalidad) })}
      columns={[
        { key: 'codigo', label: 'Codigo', render: (row) => <Badge tone="blue">{row.codigo}</Badge> },
        { key: 'nombre', label: 'Nombre' },
        { key: 'horarios', label: 'Horarios', render: (row) => row.horarios || 'Sin horario' },
        { key: 'total_estaciones', label: 'Estaciones' },
        { key: 'total_buses', label: 'Buses' },
        {
          key: 'estado',
          label: <FleetRuleHeader />,
          render: (row) => {
            const min = Number(row.total_estaciones || 0);
            const buses = Number(row.total_buses || 0);
            const cumple = min > 0 && buses >= min && buses <= min * 2;
            const max = min * 2;
            const estado = buses < min
              ? `Faltan ${min - buses} buses`
              : buses > max
                ? `Excedente de ${buses - max}`
                : 'Flota adecuada';

            return (
              <div>
                <Badge tone={cumple ? 'green' : 'amber'}>{estado}</Badge>
                <p className="mt-1 whitespace-nowrap text-xs text-slate-500">{buses} buses asignados · rango esperado: {min}-{max} buses</p>
              </div>
            );
          }
        }
      ]}
    />
  );
}
