import { useEffect, useState } from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Estaciones() {
  const { usuario } = useAuth();
  const [municipalidades, setMunicipalidades] = useState([]);

  useEffect(() => {
    if (usuario.rol !== 'Administrador') return;
    api.get('/municipalidades').then(({ data }) => setMunicipalidades(data)).catch(() => setMunicipalidades([]));
  }, [usuario.rol]);

  return (
    <CrudPage
      title="Estaciones"
      subtitle="Catalogo de estaciones oficiales y ubicaciones por linea."
      endpoint="/estaciones"
      idKey="id_estacion"
      fields={[
        { name: 'nombre', label: 'Estacion', required: true },
        { name: 'ubicacion', label: 'Ubicacion', required: true },
        { name: 'id_municipalidad', label: 'Municipalidad', type: 'select', required: true, defaultValue: 1, options: municipalidades.map((item) => ({ value: item.id_municipalidad, label: item.nombre })) }
      ]}
      normalize={(form) => ({ ...form, id_municipalidad: Number(form.id_municipalidad) })}
      columns={[
        { key: 'nombre', label: 'Estacion' },
        { key: 'ubicacion', label: 'Ubicacion' },
        { key: 'municipalidad', label: 'Municipalidad' }
      ]}
    />
  );
}
