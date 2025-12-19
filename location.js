import { saveLocation } from './api.js';

export function requestLocation() {
  return new Promise(resolve => {
    if (!('geolocation' in navigator)) return resolve();
    navigator.geolocation.getCurrentPosition(pos => {
      const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      saveLocation(coords);
      resolve(coords);
    }, () => resolve());
  });
}
