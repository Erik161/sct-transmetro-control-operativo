import { useEffect, useState } from 'react';
import CrudPage from '../components/CrudPage.jsx';
import Badge from '../components/Badge.jsx';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Buses() {
  const { usuario } = useAuth();
  const [lineas, setLineas] = useState([]);
  const [parqueos, setParqueos] = useState([]);
  const [pilotos, setPilotos] = useState([]);

  useEffect(() => {
    if (usuario.rol !== 'Administrador') return;
    Promise.all([
      api.get('/lineas'),
      api.get('/parqueos'),
      api.get('/empleados?cargo=Piloto')
    ]).then(([lineasResponse, parqueosResponse, pilotosResponse]) => {
      setLineas(lineasResponse.data);
      setParqueos(parqueosResponse.data);
      setPilotos(pilotosResponse.data);
    }).catch(() => {
      setLineas([]);
      setParqueos([]);
      setPilotos([]);
    });
  }, [usuario.rol]);

  return (
    <CrudPage
      title="Buses"
      subtitle="Flota operativa: placa, unidad, capacidad, parqueo obligatorio y piloto asignado."
      endpoint="/buses"
      idKey="id_bus"
      fields={[
        { name: 'placa', label: 'Placa', required: true },
        { name: 'num_unidad', label: 'Numero de unidad', type: 'number', required: true },
        { name: 'capacidad_maxima', label: 'Capacidad maxima', type: 'number', required: true },
        { name: 'id_linea', label: 'Linea', type: 'select', options: lineas.map((item) => ({ value: item.id_linea, label: `${item.codigo} · ${item.nombre}` })) },
        { name: 'id_parqueo', label: 'Parqueo', type: 'select', required: true, options: parqueos.map((item) => ({ value: item.id_parqueo, label: item.ubicacion })) },
        { name: 'id_piloto', label: 'Piloto', type: 'select', options: pilotos.map((item) => ({ value: item.id_empleado, label: item.nombre })) }
      ]}
      normalize={(form) => ({
        ...form,
        num_unidad: Number(form.num_unidad),
        capacidad_maxima: Number(form.capacidad_maxima),
        id_linea: form.id_linea ? Number(form.id_linea) : null,
        id_parqueo: Number(form.id_parqueo),
        id_piloto: form.id_piloto ? Number(form.id_piloto) : null
      })}
      columns={[
        { key: 'num_unidad', label: 'Unidad', render: (row) => <Badge>#{row.num_unidad}</Badge> },
        { key: 'placa', label: 'Placa' },
        { key: 'capacidad_maxima', label: 'Capacidad' },
        { key: 'linea', label: 'Linea', render: (row) => row.linea || 'Sin linea' },
        { key: 'parqueo', label: 'Parqueo' },
        { key: 'piloto', label: 'Piloto', render: (row) => row.piloto || 'Sin piloto' }
      ]}
    />
  );
}
