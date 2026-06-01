import CrudPage from '../components/CrudPage.jsx';
import Badge from '../components/Badge.jsx';

export default function Empleados() {
  return (
    <CrudPage
      title="Personal"
      subtitle="Directorio centralizado del personal operativo y administrativo."
      endpoint="/empleados"
      idKey="id_empleado"
      filters={[
        {
          key: 'cargo',
          label: 'Cargo',
          options: ['Piloto', 'Guardia', 'Operador', 'Supervisor', 'Administrador'].map((value) => ({ value, label: value }))
        }
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre completo', required: true },
        { name: 'dpi', label: 'DPI', required: true },
        { name: 'formacion_academica', label: 'Formacion academica' },
        { name: 'direccion', label: 'Direccion', required: true },
        { name: 'telefono', label: 'Telefono', required: true },
        { name: 'correo', label: 'Correo', required: true },
        {
          name: 'cargo',
          label: 'Cargo',
          type: 'select',
          required: true,
          options: ['Piloto', 'Guardia', 'Operador', 'Supervisor', 'Administrador'].map((value) => ({ value, label: value }))
        }
      ]}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'cargo', label: 'Cargo', render: (row) => <Badge tone="green">{row.cargo}</Badge> },
        { key: 'dpi', label: 'DPI' },
        { key: 'telefono', label: 'Telefono' },
        { key: 'correo', label: 'Correo' },
        {
          key: 'asignaciones_guardia',
          label: 'Asignacion operativa',
          render: (row) => {
            if (row.cargo !== 'Guardia') return <span className="text-slate-400">-</span>;
            const total = row.asignaciones_guardia
              ? row.asignaciones_guardia.split(', ').filter(Boolean).length
              : 0;
            return (
              <Badge tone={total > 0 ? 'blue' : 'amber'}>
                {total > 0 ? `${total} accesos asignados` : 'Sin asignacion'}
              </Badge>
            );
          }
        }
      ]}
    />
  );
}
