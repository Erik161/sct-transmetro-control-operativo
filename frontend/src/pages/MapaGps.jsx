import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, Map, MapPin, Route, ShieldCheck, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const LINE_STYLES = {
  L1: { color: '#0ea5e9', anchors: [[14.6411, -90.5133], [14.6295, -90.5160], [14.6180, -90.5231], [14.6348, -90.5138], [14.6431, -90.5152]] },
  L2: { color: '#f59e0b', anchors: [[14.6628, -90.5072], [14.6531, -90.5113], [14.6468, -90.5138]] },
  L6: { color: '#22c55e', anchors: [[14.6472, -90.4991], [14.6574, -90.4938], [14.6707, -90.4890], [14.6451, -90.5106]] },
  L7: { color: '#a855f7', anchors: [[14.5898, -90.5536], [14.6064, -90.5583], [14.6265, -90.5588], [14.6507, -90.5488], [14.6433, -90.5142]] },
  L12: { color: '#ef4444', anchors: [[14.6385, -90.5145], [14.6221, -90.5259], [14.6027, -90.5481], [14.5746, -90.5590]] },
  L13: { color: '#06b6d4', anchors: [[14.6379, -90.5134], [14.6192, -90.5181], [14.5968, -90.5172], [14.5839, -90.5280], [14.6119, -90.5186], [14.6295, -90.5161]] },
  L18: { color: '#f97316', anchors: [[14.6442, -90.5080], [14.6545, -90.4926], [14.6705, -90.4675]] },
  R5: { color: '#14b8a6', anchors: [[14.6400, -90.5078], [14.6325, -90.4994], [14.6194, -90.4943], [14.6247, -90.5151], [14.6400, -90.5078]] }
};

export default function MapaGps() {
  const { usuario } = useAuth();
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const stationLayer = useRef(null);
  const [lineas, setLineas] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');
  const [linea, setLinea] = useState(null);
  const [cobertura, setCobertura] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/lineas')
      .then(({ data }) => {
        setLineas(data);
        if (data[0]) setSelectedId(String(data[0].id_linea));
      })
      .catch(() => toast.error('No se pudieron cargar las lineas disponibles.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!['Administrador', 'Supervisor'].includes(usuario.rol)) return;
    api.get('/guardias/cobertura')
      .then(({ data }) => setCobertura(data))
      .catch(() => toast.error('No se pudo cargar la cobertura de seguridad.'));
  }, [usuario.rol]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    api.get(`/lineas/${selectedId}`)
      .then(({ data }) => setLinea(data))
      .catch(() => toast.error('No se pudo cargar el recorrido de la linea.'))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const selectedSummary = useMemo(
    () => lineas.find((item) => String(item.id_linea) === String(selectedId)),
    [lineas, selectedId]
  );

  const mappedStations = useMemo(() => {
    if (!linea) return [];
    return getStationsWithCoordinates(linea);
  }, [linea]);

  const lineCoverage = useMemo(() => {
    if (!linea) return [];
    const stationKeys = new Set((linea.estaciones || []).map((estacion) => `${estacion.nombre}|${estacion.ubicacion}`));
    return cobertura.filter((item) => stationKeys.has(`${item.estacion}|${item.ubicacion}`));
  }, [cobertura, linea]);

  const selectedStation = useMemo(
    () => (linea?.estaciones || []).find((estacion) => String(estacion.id_estacion) === String(selectedStationId)),
    [linea, selectedStationId]
  );

  const selectedStationCoverage = useMemo(() => {
    if (!selectedStation) return [];
    return lineCoverage.filter((item) => item.estacion === selectedStation.nombre && item.ubicacion === selectedStation.ubicacion);
  }, [lineCoverage, selectedStation]);

  const coveredStationCount = useMemo(() => {
    const stationKeys = new Set(
      lineCoverage
        .filter((item) => item.guardias_asignados > 0)
        .map((item) => `${item.estacion}|${item.ubicacion}`)
    );
    return stationKeys.size;
  }, [lineCoverage]);

  useEffect(() => {
    const estaciones = linea?.estaciones || [];
    if (estaciones.length === 0) {
      setSelectedStationId('');
      return;
    }
    const stillAvailable = estaciones.some((estacion) => String(estacion.id_estacion) === String(selectedStationId));
    if (!stillAvailable) setSelectedStationId(String(estaciones[0].id_estacion));
  }, [linea, selectedStationId]);

  useEffect(() => {
    if (!mapElement.current || mapInstance.current) return;
    mapInstance.current = L.map(mapElement.current).setView([14.6349, -90.5069], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance.current);
    stationLayer.current = L.layerGroup().addTo(mapInstance.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !stationLayer.current) return;
    stationLayer.current.clearLayers();

    if (mappedStations.length > 1) {
      L.polyline(mappedStations.map((estacion) => [estacion.lat, estacion.lng]), {
        color: LINE_STYLES[linea.codigo]?.color || '#059669',
        opacity: 0.95,
        weight: 6
      }).bindTooltip(`${linea.codigo} · ${linea.nombre}`, { sticky: true }).addTo(stationLayer.current);
    }

    mappedStations.forEach((estacion) => {
      const stationCoverage = lineCoverage.filter((item) => item.estacion === estacion.nombre && item.ubicacion === estacion.ubicacion);
      const coverageText = stationCoverage.length > 0
        ? `<br><br><strong>Seguridad</strong><br>${stationCoverage.map((item) => `${item.tipo}: ${item.guardias}`).join('<br>')}`
        : '';
      L.circleMarker([estacion.lat, estacion.lng], {
        radius: 8,
        color: '#ffffff',
        fillColor: LINE_STYLES[linea.codigo]?.color || '#059669',
        fillOpacity: 1,
        weight: 3
      })
        .bindPopup(`<strong>${estacion.orden}. ${estacion.nombre}</strong><br>${estacion.ubicacion}${coverageText}`)
        .on('click', () => setSelectedStationId(String(estacion.id_estacion)))
        .addTo(stationLayer.current);
    });

    if (mappedStations.length > 0) {
      mapInstance.current.fitBounds(mappedStations.map((estacion) => [estacion.lat, estacion.lng]), { padding: [30, 30], maxZoom: 15 });
    } else {
      mapInstance.current.setView([14.6349, -90.5069], 13);
    }
  }, [lineCoverage, linea, mappedStations]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Red y seguimiento</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Mapa GPS</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Consulta lineas, estaciones y recorridos de la red.
          </p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Route className="text-emerald-600" size={18} />
            <h3 className="font-semibold text-slate-900">Lineas disponibles</h3>
          </div>
          <div className="mt-3 space-y-2">
            {lineas.map((item) => (
              <button
                key={item.id_linea}
                type="button"
                onClick={() => setSelectedId(String(item.id_linea))}
                className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                  String(item.id_linea) === String(selectedId)
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: LINE_STYLES[item.codigo]?.color || '#64748b' }} />
                    {item.codigo}
                  </span>
                  <span className="text-xs text-slate-500">{item.total_estaciones} estaciones</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.nombre}</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Recorrido seleccionado</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">{linea?.nombre || 'Selecciona una linea'}</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedSummary?.horarios || 'Horario no disponible'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Summary icon={MapPin} label="Estaciones" value={linea?.estaciones?.length ?? 0} />
                <Summary icon={Bus} label="Buses asignados" value={linea?.buses?.length ?? 0} />
                {['Administrador', 'Supervisor'].includes(usuario.rol) && (
                  <Summary icon={ShieldCheck} label="Estaciones con seguridad" value={`${coveredStationCount}/${linea?.estaciones?.length ?? 0}`} />
                )}
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Mapa interactivo de red</h3>
                <p className="mt-1 text-xs text-slate-500">Ubicacion de estaciones registradas.</p>
              </div>
              <p className="text-xs text-slate-500">{mappedStations.length} estaciones visibles</p>
            </div>
            <div ref={mapElement} className="h-[420px] w-full bg-slate-100" />
            <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LINE_STYLES[linea?.codigo]?.color || '#64748b' }} />
              {linea ? `${linea.codigo} · ${linea.nombre}` : 'Selecciona una linea'}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-semibold text-slate-900">Unidades asignadas</h3>
                <p className="mt-1 text-xs text-slate-500">Detalle de buses registrados en la linea seleccionada.</p>
              </div>
              <Bus size={19} className="text-emerald-600" />
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2">
              {(linea?.buses || []).length === 0 && (
                <p className="text-sm text-slate-500">No hay buses asignados a esta linea.</p>
              )}
              {(linea?.buses || []).map((bus) => (
                <div key={bus.id_bus} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">Unidad #{bus.num_unidad}</p>
                      <p className="mt-1 text-xs text-slate-500">{bus.placa}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{bus.capacidad_maxima} pasajeros</span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2"><UserRound size={15} className="text-emerald-600" />{bus.piloto || 'Sin piloto asignado'}</p>
                    <p className="flex items-center gap-2"><MapPin size={15} className="text-emerald-600" />{bus.parqueo}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-semibold text-slate-900">Estaciones en orden de recorrido</h3>
                <p className="mt-1 text-xs text-slate-500">Secuencia registrada para la linea seleccionada.</p>
              </div>
              <Map size={19} className="text-emerald-600" />
            </div>
            {loading ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">Cargando recorrido...</p>
            ) : (
              <div className="grid gap-5 px-5 py-4 lg:grid-cols-[1fr_360px]">
                <div>
                {(linea?.estaciones || []).length === 0 && <p className="py-6 text-center text-sm text-slate-500">No hay estaciones registradas para esta linea.</p>}
                {(linea?.estaciones || []).map((estacion, index) => (
                  <button
                    key={estacion.id_estacion}
                    type="button"
                    onClick={() => setSelectedStationId(String(estacion.id_estacion))}
                    className={`relative flex w-full gap-4 rounded-lg px-2 py-2 text-left transition ${
                      String(estacion.id_estacion) === String(selectedStationId)
                        ? 'bg-emerald-50 ring-1 ring-emerald-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {index < linea.estaciones.length - 1 && <span className="absolute left-[11px] top-6 h-full w-0.5 bg-emerald-200" />}
                    <span className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">{estacion.orden}</span>
                    <div className="pb-3">
                      <p className="font-medium text-slate-900">{estacion.nombre}</p>
                      <p className="mt-1 text-sm text-slate-500">{estacion.ubicacion}</p>
                      {Number(estacion.distancia_anterior) > 0 && <p className="mt-1 text-xs text-slate-400">{estacion.distancia_anterior} km desde la estacion anterior</p>}
                    </div>
                  </button>
                ))}
                </div>
                <StationDetail
                  estacion={selectedStation}
                  cobertura={selectedStationCoverage}
                  showSecurity={['Administrador', 'Supervisor'].includes(usuario.rol)}
                />
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

function StationDetail({ estacion, cobertura, showSecurity }) {
  if (!estacion) {
    return <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Selecciona una estacion para consultar su detalle.</div>;
  }

  return (
    <aside className="h-fit rounded-lg border border-slate-200 bg-slate-50 p-4 lg:sticky lg:top-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Estacion seleccionada</p>
      <h4 className="mt-2 font-semibold text-slate-900">{estacion.nombre}</h4>
      <p className="mt-1 text-sm text-slate-500">{estacion.ubicacion}</p>

      {showSecurity && (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-emerald-600" />
            <h5 className="text-sm font-semibold text-slate-900">Seguridad en estacion</h5>
          </div>
          <div className="mt-3 space-y-2">
            {cobertura.length === 0 && <p className="text-sm text-slate-500">Sin accesos registrados.</p>}
            {cobertura.map((item) => (
              <div key={item.id_acceso} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.tipo}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.guardias_asignados > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {item.guardias_asignados > 0 ? 'Cubierto' : 'Sin guardia'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{item.guardias}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function getStationsWithCoordinates(linea) {
  const estaciones = linea.estaciones || [];
  const anchors = LINE_STYLES[linea.codigo]?.anchors || [];
  if (estaciones.length === 0 || anchors.length === 0) return [];

  return estaciones.map((estacion, index) => {
    const progress = estaciones.length === 1 ? 0 : index / (estaciones.length - 1);
    const position = interpolateRoute(anchors, progress);
    return { ...estacion, lat: position[0], lng: position[1] };
  });
}

function interpolateRoute(anchors, progress) {
  if (anchors.length === 1) return anchors[0];
  const scaled = progress * (anchors.length - 1);
  const segment = Math.min(Math.floor(scaled), anchors.length - 2);
  const segmentProgress = scaled - segment;
  const start = anchors[segment];
  const end = anchors[segment + 1];

  return [
    start[0] + (end[0] - start[0]) * segmentProgress,
    start[1] + (end[1] - start[1]) * segmentProgress
  ];
}

function Summary({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <Icon className="text-emerald-600" size={17} />
      <p className="mt-2 text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
