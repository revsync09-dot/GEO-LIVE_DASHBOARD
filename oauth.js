import { setToken, getToken, getUser, getGuilds, saveUser, saveGuilds } from './api.js';

const DISCORD_API = 'https://discord.com/api/v10';

function parseHash(hash) {
  if (!hash.startsWith('#')) return null;
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get('access_token');
  return token ? { token } : null;
}

async function fetchDiscordData(token) {
  const headers = { Authorization: `Bearer ${token}` };
  const [userRes, guildRes] = await Promise.allSettled([
    fetch(`${DISCORD_API}/users/@me`, { headers }),
    fetch(`${DISCORD_API}/users/@me/guilds`, { headers })
  ]);

  let user = null;
  if (userRes.status === 'fulfilled' && userRes.value.ok) {
    user = await userRes.value.json();
  } else {
    console.warn('Failed to load Discord profile');
  }

  let guilds = null;
  if (guildRes.status === 'fulfilled' && guildRes.value.ok) {
    guilds = await guildRes.value.json();
  } else {
    console.warn('Failed to load Discord guilds');
  }

  return { user, guilds };
}

function withManageFlag(guilds) {
  return guilds.map(guild => {
    const permissionValue = guild.permissions ? BigInt(guild.permissions) : 0n;
    const canManage = (permissionValue & 0x20n) !== 0n;
    return { ...guild, canManage };
  });
}

export async function handleOAuthRedirect() {
  const parsed = parseHash(window.location.hash);
  const token = parsed?.token || getToken();
  if (!token) return;

  if (parsed?.token) {
    setToken(token);
    window.location.hash = '';
  }

  const shouldFetch = Boolean(parsed?.token) || !getUser() || getGuilds().length === 0;
  if (!shouldFetch) return;

  try {
    const { user, guilds } = await fetchDiscordData(token);
    if (user) saveUser(user);
    if (Array.isArray(guilds)) saveGuilds(withManageFlag(guilds));
  } catch (err) {
    console.error('OAuth handling failed', err);
    alert('Discord login failed. Please retry.');
  }
}
