import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../services/api.js';
import DataTable from './DataTable.jsx';
import PageHeader from './PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function emptyForm(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, field.defaultValue ?? '']));
}

export default function CrudPage({ title, subtitle, notice, endpoint, writeEndpoint = endpoint, idKey, columns, fields, filters = [], normalize = (x) => x }) {
  const { usuario } = useAuth();
  const canManage = usuario?.rol === 'Administrador';
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => emptyForm(fields));
  const [open, setOpen] = useState(false);

  const tableColumns = useMemo(() => {
    if (!canManage) return columns;
    return [...columns, {
      key: 'acciones',
      label: 'Acciones',
      render: (row) => (
        <div className="flex gap-2">
          <button onClick={() => startEdit(row)} className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Editar">
            <Pencil size={16} />
          </button>
          <button onClick={() => remove(row)} className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50" title="Eliminar">
            <Trash2 size={16} />
          </button>
        </div>
      )
    }];
  }, [canManage, columns]);

  function load() {
    api.get(endpoint).then((res) => setRows(res.data)).catch(() => setRows([]));
  }

  useEffect(() => {
    load();
  }, [endpoint]);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm(fields));
    setOpen(true);
  }

  function startEdit(row) {
    setEditing(row);
    setForm(Object.fromEntries(fields.map((field) => [field.name, row[field.name] ?? field.defaultValue ?? ''])));
    setOpen(true);
  }

  async function submit(event) {
    event.preventDefault();
    const payload = normalize(form);
    try {
      if (editing) {
        await api.put(`${writeEndpoint}/${editing[idKey]}`, payload);
        toast.success('Registro actualizado');
      } else {
        await api.post(writeEndpoint, payload);
        toast.success('Registro creado');
      }
      setOpen(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo guardar');
    }
  }

  async function remove(row) {
    if (!window.confirm('Eliminar este registro?')) return;
    try {
      await api.delete(`${writeEndpoint}/${row[idKey]}`);
      toast.success('Registro eliminado');
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo eliminar');
    }
  }

  return (
    <section>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={canManage ? (
          <button onClick={startCreate} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <Plus size={16} />
            Agregar
          </button>
        ) : null}
      />
      {notice && <div className="mt-6">{notice}</div>}
      <DataTable rows={rows} columns={tableColumns} rowKey={idKey} filters={filters} />

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/40">
          <form onSubmit={submit} className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{editing ? 'Editar registro' : 'Nuevo registro'}</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {fields.filter((field) => !field.hidden).map((field) => (
                <label key={field.name} className="text-sm font-medium text-slate-700">
                  {field.label}
                  {field.type === 'select' ? (
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      value={form[field.name]}
                      onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                      required={field.required}
                    >
                      <option value="">Seleccione</option>
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      type={field.type || 'text'}
                      value={form[field.name]}
                      onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                      required={field.required}
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancelar</button>
              <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
