import { getLocation } from './api.js';

function widgetCard(title, lines = []) {
  const div = document.createElement('div');
  div.className = 'widget-card';
  div.innerHTML = `<h4>${title}</h4>${lines.map(line => `<p>${line}</p>`).join('')}`;
  return div;
}

export async function fetchWeather(coords) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather failed');
  const data = await res.json();
  const temp = data.current_weather?.temperature ?? data.hourly?.temperature_2m?.[0];
  const wind = data.current_weather?.windspeed ?? data.hourly?.windspeed_10m?.[0];
  const humidity = data.hourly?.relativehumidity_2m?.[0];
  return { temp, wind, humidity };
}

export async function fetchEarthquake(limit = 5) {
  const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
  if (!res.ok) throw new Error('Quake failed');
  const data = await res.json();
  const list = data.features?.slice(0, limit).map(f => ({
    place: f.properties.place || 'Unknown location',
    mag: f.properties.mag ? Number(f.properties.mag).toFixed(1) : 'N/A'
  })) || [];
  return list;
}

export async function fetchISS() {
  const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
  if (!res.ok) throw new Error('ISS failed');
  const data = await res.json();
  return { lat: data.latitude, lon: data.longitude, velocity: data.velocity };
}

export async function fetchAurora() {
  const res = await fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json');
  if (!res.ok) throw new Error('Aurora failed');
  const data = await res.json();
  const kp = data.Kp || data.kp_index || 'N/A';
  const status = Number(kp) >= 5 ? 'Active' : 'Inactive';
  return { kp, status, updated: data.ObservationTime || data.ForecastTime || 'Just now' };
}

export async function initWidgets() {
  const container = document.getElementById('widgets');
  if (!container) return;
  container.innerHTML = '';
  const coords = getLocation();
  if (!coords) {
    container.appendChild(widgetCard('Location Needed', ['Enable location to personalize widgets.']));
    return;
  }

  const loaders = [
    ['Local Weather', fetchWeather(coords).then(res => [`Temp: ${res.temp} C`, `Wind: ${res.wind} km/h`, `Humidity: ${res.humidity}%`])],
    ['Earthquakes', fetchEarthquake().then(list => list.length ? list.map(q => `${q.place} (M${q.mag})`) : ['No quakes in the last day'])],
    ['ISS Position', fetchISS().then(res => [`Lat: ${res.lat.toFixed(2)}`, `Lon: ${res.lon.toFixed(2)}`, `Velocity: ${res.velocity.toFixed(1)} km/h`])],
    ['Aurora Forecast', fetchAurora().then(res => [`Status: ${res.status}`, `Kp: ${res.kp}`, `Updated: ${res.updated}`])]
  ];

  for (const [title, promise] of loaders) {
    const card = widgetCard(title, ['Loading...']);
    container.appendChild(card);
    promise
      .then(lines => {
        card.innerHTML = `<h4>${title}</h4>${lines.map(line => `<p>${line}</p>`).join('')}`;
      })
      .catch(() => {
        card.innerHTML = `<h4>${title}</h4><p class="subtext">Failed to load</p>`;
      });
  }
}
