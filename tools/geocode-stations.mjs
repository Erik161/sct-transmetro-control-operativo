import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const inputPath = resolve('backend/database/transmetro-publico-oficial.json');
const outputPath = resolve('frontend/src/data/stationCoordinates.json');
const cachePath = resolve('tools/.cache/station-geocoding.json');
const userAgent = 'SCT-Transmetro/1.0';

const source = JSON.parse(await readFile(inputPath, 'utf8'));
const cache = await readJson(cachePath, {});
const records = [];

for (const linea of source.lineas) {
  for (const [nombre, ubicacion] of linea.estaciones) {
    const key = `${linea.codigo}|${nombre}|${ubicacion}`;
    if (!cache[key]) {
      cache[key] = await findLocation(nombre, ubicacion);
      await saveJson(cachePath, cache);
      await sleep(1100);
    }
    if (cache[key].lat && cache[key].lng) records.push({ codigo: linea.codigo, nombre, ubicacion, ...cache[key] });
  }
}

await saveJson(outputPath, records);
console.log(`Coordenadas resueltas: ${records.length}`);
console.log(`Coordenadas pendientes: ${Object.keys(cache).length - records.length}`);

async function findLocation(nombre, ubicacion) {
  const queries = [
    `${nombre}, ${ubicacion}, Ciudad de Guatemala, Guatemala`,
    `${ubicacion}, Ciudad de Guatemala, Guatemala`
  ];

  for (const q of queries) {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'gt');
    const response = await fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Nominatim respondio ${response.status}`);
    const [match] = await response.json();
    if (match) return { lat: Number(match.lat), lng: Number(match.lon), display_name: match.display_name };
    await sleep(1100);
  }
  return {};
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function saveJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
