import { setToken, saveUser, saveGuilds } from './api.js';

const DISCORD_API = 'https://discord.com/api/v10';

function parseHash(hash) {
  if (!hash.startsWith('#')) return null;
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get('access_token');
  return token ? { token } : null;
}

export async function handleOAuthRedirect() {
  const parsed = parseHash(window.location.hash);
  if (!parsed) return;
  const token = parsed.token;
  setToken(token);
  window.location.hash = '';

  try {
    const [userRes, guildRes] = await Promise.all([
      fetch(`${DISCORD_API}/users/@me`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${DISCORD_API}/users/@me/guilds`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    if (!userRes.ok || !guildRes.ok) throw new Error('OAuth fetch failed');

    const user = await userRes.json();
    const guilds = await guildRes.json();

    const guildsWithAccess = guilds.map(guild => {
      const permissionValue = guild.permissions ? BigInt(guild.permissions) : 0n;
      const canManage = (permissionValue & 0x20n) !== 0n;
      return { ...guild, canManage };
    });

    saveUser(user);
    saveGuilds(guildsWithAccess);
  } catch (err) {
    console.error('OAuth handling failed', err);
    alert('Discord login failed. Please retry.');
  }
}
