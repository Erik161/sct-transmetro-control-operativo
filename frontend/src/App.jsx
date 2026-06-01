import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import { Bell, Bus, LayoutDashboard, LogOut, Map, MapPin, Route as RouteIcon, Users } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { connectSocket, disconnectSocket } from './services/socket.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Operacion from './pages/Operacion.jsx';
import Lineas from './pages/Lineas.jsx';
import Estaciones from './pages/Estaciones.jsx';
import Buses from './pages/Buses.jsx';
import Empleados from './pages/Empleados.jsx';
import MapaGps from './pages/MapaGps.jsx';

function Shell() {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const [alertas, setAlertas] = useState(0);

  useEffect(() => {
    if (!usuario) return undefined;
    const socket = connectSocket();
    socket.on('nueva_alerta', () => setAlertas((total) => total + 1));
    return () => {
      socket.off('nueva_alerta');
      disconnectSocket();
    };
  }, [usuario]);

  if (!usuario) return <Login />;

  const items = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['Administrador', 'Supervisor', 'Operador', 'Guardia'] },
    { to: '/lineas', label: 'Lineas', icon: RouteIcon, roles: ['Administrador', 'Supervisor', 'Operador'] },
    { to: '/estaciones', label: 'Estaciones', icon: MapPin, roles: ['Administrador', 'Supervisor', 'Operador'] },
    { to: '/buses', label: 'Buses', icon: Bus, roles: ['Administrador', 'Supervisor', 'Operador'] },
    { to: '/mapa-gps', label: 'Mapa GPS', icon: Map, roles: ['Administrador', 'Supervisor', 'Operador'] },
    { to: '/personal', label: 'Personal', icon: Users, roles: ['Administrador', 'Supervisor'] },
    { to: '/operacion', label: 'Operacion', icon: Bell, badge: alertas, roles: ['Administrador', 'Operador'] }
  ].filter((item) => item.roles.includes(usuario.rol));

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-950 text-white md:block">
        <div className="border-b border-slate-800 px-5 py-5">
          <h1 className="text-lg font-semibold">SCT Transmetro</h1>
          <p className="mt-1 text-xs text-slate-400">NovaTech Solutions</p>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge > 0 && <span className="ml-auto rounded-full bg-red-500 px-2 text-xs">{item.badge}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800 p-4">
          <p className="text-sm text-slate-300">{usuario.nombre}</p>
          <p className="mb-3 mt-1 text-xs text-emerald-400">{usuario.rol}</p>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
            <LogOut size={16} />
            Cerrar sesion
          </button>
        </div>
      </aside>
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950 text-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-semibold">SCT Transmetro</h1>
            <p className="text-xs text-emerald-400">{usuario.rol}</p>
          </div>
          <button onClick={logout} className="rounded-md p-2 text-slate-300 hover:bg-slate-800" title="Cerrar sesion">
            <LogOut size={18} />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs ${
                  active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.badge > 0 && <span className="rounded-full bg-red-500 px-1.5 text-xs">{item.badge}</span>}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="min-h-screen p-4 md:ml-64 md:p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/lineas" element={<RoleRoute usuario={usuario} roles={['Administrador', 'Supervisor', 'Operador']}><Lineas /></RoleRoute>} />
          <Route path="/estaciones" element={<RoleRoute usuario={usuario} roles={['Administrador', 'Supervisor', 'Operador']}><Estaciones /></RoleRoute>} />
          <Route path="/buses" element={<RoleRoute usuario={usuario} roles={['Administrador', 'Supervisor', 'Operador']}><Buses /></RoleRoute>} />
          <Route path="/mapa-gps" element={<RoleRoute usuario={usuario} roles={['Administrador', 'Supervisor', 'Operador']}><MapaGps /></RoleRoute>} />
          <Route path="/personal" element={<RoleRoute usuario={usuario} roles={['Administrador', 'Supervisor']}><Empleados /></RoleRoute>} />
          <Route path="/empleados" element={<Navigate to="/personal" />} />
          <Route path="/guardias" element={<Navigate to="/personal" />} />
          <Route path="/operacion" element={<RoleRoute usuario={usuario} roles={['Administrador', 'Operador']}><Operacion /></RoleRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

function RoleRoute({ usuario, roles, children }) {
  return roles.includes(usuario.rol) ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
