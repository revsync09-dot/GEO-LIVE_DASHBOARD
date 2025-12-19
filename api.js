const TOKEN_KEY = 'geolive_token';
const USER_KEY = 'geolive_user';
const GUILDS_KEY = 'geolive_guilds';

const DEFAULT_CONFIG = {
  apiBaseUrl: 'https://YOUR-FLY-URL',
  clientId: 'YOUR_CLIENT_ID',
  scope: 'identify guilds',
  redirectUri: ''
};

export const DEFAULT_SETTINGS = {
  earthquake_enabled: true,
  weather_enabled: true,
  iss_enabled: false,
  aurora_enabled: true,
  weather_command_enabled: true,
  space_command_enabled: true,
  disaster_command_enabled: true,
  auto_feed_enabled: true,
  command_output: 'embed',
  interval: 25,
  accent_color: '#f2f2f2',
  banner_url: ''
};

let cachedConfig;
let configPromise;

function parseEnv(text) {
  const env = {};
  if (!text) return env;
  text.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index === -1) return;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  });
  return env;
}

async function loadEnvFile() {
  try {
    const res = await fetch('/.env', { cache: 'no-store' });
    if (!res.ok) return {};
    const text = await res.text();
    return parseEnv(text);
  } catch {
    return {};
  }
}

function resolveRedirectUri(value) {
  if (value) return value;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/dashboard.html`;
  }
  return 'https://YOUR-REDIRECT/dashboard.html';
}

function normalizeConfig(envFile = {}, runtime = {}) {
  const apiBaseUrl = runtime.API_BASE_URL || envFile.GEOLIVE_API_BASE_URL || envFile.API_BASE_URL || DEFAULT_CONFIG.apiBaseUrl;
  const clientId = runtime.CLIENT_ID || envFile.GEOLIVE_CLIENT_ID || envFile.CLIENT_ID || DEFAULT_CONFIG.clientId;
  const scope = runtime.SCOPE || envFile.GEOLIVE_SCOPE || envFile.SCOPE || DEFAULT_CONFIG.scope;
  const redirectUri = runtime.REDIRECT_URI || envFile.GEOLIVE_REDIRECT_URI || envFile.REDIRECT_URI || DEFAULT_CONFIG.redirectUri;

  return {
    apiBaseUrl,
    clientId,
    scope,
    redirectUri: resolveRedirectUri(redirectUri)
  };
}

async function getConfig() {
  if (cachedConfig) return cachedConfig;
  if (configPromise) return configPromise;

  configPromise = (async () => {
    const envFile = await loadEnvFile();
    const runtime = typeof window !== 'undefined' ? (window.GEOLIVE_CONFIG || {}) : {};
    cachedConfig = normalizeConfig(envFile, runtime);
    return cachedConfig;
  })();

  return configPromise;
}

export async function getOAuthConfig() {
  const config = await getConfig();
  return {
    clientId: config.clientId,
    scope: config.scope,
    redirectUri: config.redirectUri
  };
}

export async function getApiBaseUrl() {
  const config = await getConfig();
  return config.apiBaseUrl;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function saveGuilds(guilds) {
  localStorage.setItem(GUILDS_KEY, JSON.stringify(guilds));
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function getGuilds() {
  const raw = localStorage.getItem(GUILDS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveLocation(coords) {
  localStorage.setItem('geolive_location', JSON.stringify(coords));
}

export function getLocation() {
  const raw = localStorage.getItem('geolive_location');
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(GUILDS_KEY);
}

function normalizeSettings(data) {
  const output = data.command_output === 'graph' || data.command_output === 'embed'
    ? data.command_output
    : DEFAULT_SETTINGS.command_output;
  return {
    earthquake_enabled: typeof data.earthquake_enabled === 'boolean' ? data.earthquake_enabled : DEFAULT_SETTINGS.earthquake_enabled,
    weather_enabled: typeof data.weather_enabled === 'boolean' ? data.weather_enabled : DEFAULT_SETTINGS.weather_enabled,
    iss_enabled: typeof data.iss_enabled === 'boolean' ? data.iss_enabled : DEFAULT_SETTINGS.iss_enabled,
    aurora_enabled: typeof data.aurora_enabled === 'boolean' ? data.aurora_enabled : DEFAULT_SETTINGS.aurora_enabled,
    weather_command_enabled: typeof data.weather_command_enabled === 'boolean' ? data.weather_command_enabled : DEFAULT_SETTINGS.weather_command_enabled,
    space_command_enabled: typeof data.space_command_enabled === 'boolean' ? data.space_command_enabled : DEFAULT_SETTINGS.space_command_enabled,
    disaster_command_enabled: typeof data.disaster_command_enabled === 'boolean' ? data.disaster_command_enabled : DEFAULT_SETTINGS.disaster_command_enabled,
    auto_feed_enabled: typeof data.auto_feed_enabled === 'boolean' ? data.auto_feed_enabled : DEFAULT_SETTINGS.auto_feed_enabled,
    command_output: output,
    interval: Number.isFinite(Number(data.interval)) ? Number(data.interval) : DEFAULT_SETTINGS.interval,
    accent_color: data.accent_color || DEFAULT_SETTINGS.accent_color,
    banner_url: data.banner_url || DEFAULT_SETTINGS.banner_url
  };
}

export async function fetchSettings(guildId) {
  if (!guildId) throw new Error('Missing guild ID');
  const baseUrl = await getApiBaseUrl();
  const url = `${baseUrl}/api/get_settings?guild_id=${encodeURIComponent(guildId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Settings fetch failed');
  const data = await res.json();
  return normalizeSettings(data);
}

export async function updateSettings(payload) {
  const baseUrl = await getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/update_settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error('Settings update failed');
  try {
    return await res.json();
  } catch {
    return { ok: true };
  }
}
