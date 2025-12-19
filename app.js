import { getOAuthConfig, getToken, clearSession, getUser, getGuilds, getLocation } from './api.js';
import { fetchWeather, fetchEarthquake, fetchAurora } from './widgets.js';

const BOT_INVITE_BASE = 'https://discord.com/oauth2/authorize?client_id=1450090260200558643&scope=bot&permissions=0';

export async function startOAuth() {
  const oauth = await getOAuthConfig();
  const redirect = encodeURIComponent(oauth.redirectUri);
  const scope = encodeURIComponent(oauth.scope);
  const url = `https://discord.com/api/oauth2/authorize?client_id=${oauth.clientId}&redirect_uri=${redirect}&response_type=token&scope=${scope}`;
  window.location.href = url;
}

export function ensureAuthenticated() {
  if (!getToken()) {
    window.location.href = 'index.html';
  }
}

export function hydrateUserBadge() {
  const user = getUser();
  if (!user) return;
  let defaultIndex = 0;
  if (user.discriminator && user.discriminator !== '0') {
    defaultIndex = Number(user.discriminator) % 5;
  } else {
    try {
      defaultIndex = Number((BigInt(user.id) >> 22n) % 6n);
    } catch {
      defaultIndex = 0;
    }
  }

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;

  document.querySelectorAll('[data-user-avatar]').forEach(el => {
    el.src = avatarUrl;
  });

  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = user.username;
  });
}

export function logout() {
  clearSession();
  window.location.href = 'index.html';
}

export function renderGuilds(container, searchInput) {
  const guilds = getGuilds();
  if (!container) return;

  function buildInviteUrl(guildId) {
    if (!guildId) return BOT_INVITE_BASE;
    return `${BOT_INVITE_BASE}&guild_id=${guildId}&disable_guild_select=true`;
  }

  function render(list) {
    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = '<p class="subtext">No servers found for this user.</p>';
      return;
    }
    list.forEach(guild => {
      const card = document.createElement('div');
      card.className = 'server-card';
      const iconUrl = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
        : 'https://cdn.discordapp.com/embed/avatars/0.png';
      const canManage = typeof guild.canManage === 'boolean'
        ? guild.canManage
        : guild.permissions
          ? (BigInt(guild.permissions) & 0x20n) !== 0n
          : false;
      const inviteUrl = buildInviteUrl(guild.id);
      card.innerHTML = `
        <img class="server-icon" src="${iconUrl}" alt="${guild.name}" />
        <h4>${guild.name}</h4>
        <div class="server-actions">
          <button class="btn-primary manage-btn" data-id="${guild.id}" type="button" ${canManage ? '' : 'disabled'}>Manage</button>
          <a class="btn-secondary invite-btn" href="${inviteUrl}" target="_blank" rel="noreferrer">Invite</a>
        </div>
        ${canManage ? '' : '<p class="subtext server-note">Missing Manage Server permission.</p>'}
      `;
      const manageBtn = card.querySelector('.manage-btn');
      if (manageBtn && canManage) {
        manageBtn.addEventListener('click', () => {
          window.location.href = `settings.html?guild=${guild.id}`;
        });
      }
      container.appendChild(card);
    });
  }

  render(guilds);

  if (searchInput) {
    searchInput.addEventListener('input', event => {
      const term = event.target.value.toLowerCase();
      const filtered = guilds.filter(guild => guild.name.toLowerCase().includes(term));
      render(filtered);
    });
  }
}

export function hydrateHero() {
  const firstEl = document.getElementById('heroFirst');
  const lastEl = document.getElementById('heroLast');
  if (!firstEl || !lastEl) return;

  const user = getUser();
  const displayName = user?.global_name || user?.username || 'GeoLive User';
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || 'Geo';
  const last = parts.slice(1).join(' ') || 'User';

  firstEl.textContent = first;
  lastEl.textContent = last;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

export async function initLiveFeed() {
  const coords = getLocation();
  if (!coords) {
    setText('locationLabel', 'Enable location to see live data.');
    return;
  }
  setText('locationLabel', `Location: ${coords.lat.toFixed(2)}, ${coords.lon.toFixed(2)}`);

  try {
    const [weather, quakes, aurora] = await Promise.all([
      fetchWeather(coords),
      fetchEarthquake(6),
      fetchAurora()
    ]);

    const tempValue = Number.isFinite(weather.temp) ? `${Math.round(weather.temp)} C` : '-- C';
    const windValue = Number.isFinite(weather.wind) ? `${Math.round(weather.wind)} km/h` : '-- km/h';
    const humidityValue = Number.isFinite(weather.humidity) ? `${Math.round(weather.humidity)}%` : '--%';

    setText('weather-temp', tempValue);
    setText('weather-wind', windValue);
    setText('weather-humidity', humidityValue);

    const list = document.getElementById('quakeList');
    if (list) {
      list.innerHTML = '';
      if (!quakes.length) {
        list.innerHTML = '<li class="subtext">No quakes in the last day</li>';
      } else {
        quakes.forEach(quake => {
          const item = document.createElement('li');
          item.className = 'quake-item';
          item.innerHTML = `<span>${quake.place}</span><span class="quake-mag">M${quake.mag}</span>`;
          list.appendChild(item);
        });
      }
    }

    setText('auroraStatus', aurora.status);
    setText('auroraUpdated', `Updated: ${aurora.updated}`);
    setText('auroraKP', `Kp Index: ${aurora.kp}`);

    const badge = document.getElementById('auroraStatus');
    if (badge) {
      const isActive = aurora.status === 'Active';
      badge.style.background = isActive ? 'rgba(25, 245, 159, 0.2)' : 'rgba(255, 255, 255, 0.08)';
      badge.style.color = isActive ? '#19f59f' : '#d0d6e4';
    }
  } catch (err) {
    console.error(err);
    setText('locationLabel', 'Live data unavailable right now.');
  }
}

export function initGlow() {
  const targets = Array.from(document.querySelectorAll('.glow-target'));
  if (!targets.length) return;
  let on = false;
  setInterval(() => {
    on = !on;
    targets.forEach(el => el.classList.toggle('is-glowing', on));
  }, 2000);
}
