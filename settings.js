import { DEFAULT_SETTINGS, fetchSettings, updateSettings } from './api.js';

function getGuildId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('guild') || params.get('guild_id');
}

function setAccentSelection(color) {
  const pills = document.querySelectorAll('.accent-pill');
  pills.forEach(pill => {
    const isMatch = pill.dataset.color?.toLowerCase() === color.toLowerCase();
    pill.classList.toggle('selected', isMatch);
  });
  document.documentElement.style.setProperty('--accent-user', color);
}

function setCommandOutputSelection(value) {
  const pills = document.querySelectorAll('.output-pill');
  pills.forEach(pill => {
    const isMatch = pill.dataset.value === value;
    pill.classList.toggle('selected', isMatch);
    const input = pill.querySelector('input');
    if (input) input.checked = isMatch;
  });
}

function updateIntervalLabel(value) {
  const label = document.getElementById('intervalValue');
  if (label) label.textContent = value;
}

function flashSaved(section) {
  if (!section) return;
  section.classList.remove('saved');
  void section.offsetWidth;
  section.classList.add('saved');
  setTimeout(() => section.classList.remove('saved'), 900);
}

let statusTimer;
function showStatus(message, isError = false) {
  const status = document.getElementById('saveStatus');
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? '#ff6b6b' : '#1fe39d';
  if (statusTimer) window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    status.textContent = '';
  }, 2000);
}

export async function initSettings() {
  const guildId = getGuildId();
  if (!guildId) {
    showStatus('Missing guild id in URL.', true);
    return;
  }

  const state = { ...DEFAULT_SETTINGS, guild_id: guildId };

  try {
    const remote = await fetchSettings(guildId);
    Object.assign(state, remote);
  } catch (err) {
    console.warn('Using default settings', err);
  }

  const toggleWeather = document.getElementById('toggleWeather');
  const toggleEarthquake = document.getElementById('toggleEarthquake');
  const toggleISS = document.getElementById('toggleISS');
  const toggleAurora = document.getElementById('toggleAurora');
  const toggleWeatherCmd = document.getElementById('toggleWeatherCmd');
  const toggleSpaceCmd = document.getElementById('toggleSpaceCmd');
  const toggleDisasterCmd = document.getElementById('toggleDisasterCmd');
  const toggleAutoFeed = document.getElementById('toggleAutoFeed');
  const refreshRange = document.getElementById('refreshRange');
  const bannerUrl = document.getElementById('bannerUrl');
  const outputInputs = document.querySelectorAll('input[name="commandOutput"]');

  if (toggleWeather) toggleWeather.checked = state.weather_enabled;
  if (toggleEarthquake) toggleEarthquake.checked = state.earthquake_enabled;
  if (toggleISS) toggleISS.checked = state.iss_enabled;
  if (toggleAurora) toggleAurora.checked = state.aurora_enabled;
  if (toggleWeatherCmd) toggleWeatherCmd.checked = state.weather_command_enabled;
  if (toggleSpaceCmd) toggleSpaceCmd.checked = state.space_command_enabled;
  if (toggleDisasterCmd) toggleDisasterCmd.checked = state.disaster_command_enabled;
  if (toggleAutoFeed) toggleAutoFeed.checked = state.auto_feed_enabled;
  if (refreshRange) refreshRange.value = state.interval;
  updateIntervalLabel(state.interval);
  if (bannerUrl) bannerUrl.value = state.banner_url;
  setAccentSelection(state.accent_color);
  setCommandOutputSelection(state.command_output);

  async function sendUpdate(section) {
    try {
      await updateSettings({
        guild_id: state.guild_id,
        earthquake_enabled: state.earthquake_enabled,
        weather_enabled: state.weather_enabled,
        iss_enabled: state.iss_enabled,
        aurora_enabled: state.aurora_enabled,
        weather_command_enabled: state.weather_command_enabled,
        space_command_enabled: state.space_command_enabled,
        disaster_command_enabled: state.disaster_command_enabled,
        auto_feed_enabled: state.auto_feed_enabled,
        command_output: state.command_output,
        interval: state.interval,
        accent_color: state.accent_color,
        banner_url: state.banner_url
      });
      flashSaved(section);
      showStatus('Saved');
    } catch (error) {
      console.error(error);
      showStatus('Save failed', true);
    }
  }

  if (toggleWeather) {
    toggleWeather.addEventListener('change', event => {
      state.weather_enabled = event.target.checked;
      sendUpdate(event.target.closest('.settings-section'));
    });
  }

  if (toggleEarthquake) {
    toggleEarthquake.addEventListener('change', event => {
      state.earthquake_enabled = event.target.checked;
      sendUpdate(event.target.closest('.settings-section'));
    });
  }

  if (toggleISS) {
    toggleISS.addEventListener('change', event => {
      state.iss_enabled = event.target.checked;
      sendUpdate(event.target.closest('.settings-section'));
    });
  }

  if (toggleAurora) {
    toggleAurora.addEventListener('change', event => {
      state.aurora_enabled = event.target.checked;
      sendUpdate(event.target.closest('.settings-section'));
    });
  }

  if (toggleWeatherCmd) {
    toggleWeatherCmd.addEventListener('change', event => {
      state.weather_command_enabled = event.target.checked;
      sendUpdate(event.target.closest('.settings-section'));
    });
  }

  if (toggleSpaceCmd) {
    toggleSpaceCmd.addEventListener('change', event => {
      state.space_command_enabled = event.target.checked;
      sendUpdate(event.target.closest('.settings-section'));
    });
  }

  if (toggleDisasterCmd) {
    toggleDisasterCmd.addEventListener('change', event => {
      state.disaster_command_enabled = event.target.checked;
      sendUpdate(event.target.closest('.settings-section'));
    });
  }

  if (toggleAutoFeed) {
    toggleAutoFeed.addEventListener('change', event => {
      state.auto_feed_enabled = event.target.checked;
      sendUpdate(event.target.closest('.settings-section'));
    });
  }

  outputInputs.forEach(input => {
    input.addEventListener('change', event => {
      state.command_output = event.target.value;
      setCommandOutputSelection(state.command_output);
      sendUpdate(event.target.closest('.settings-section'));
    });
  });

  if (refreshRange) {
    refreshRange.addEventListener('input', event => {
      state.interval = Number(event.target.value);
      updateIntervalLabel(state.interval);
      sendUpdate(event.target.closest('.settings-section'));
    });
  }

  const pills = document.querySelectorAll('.accent-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', event => {
      const color = event.currentTarget.dataset.color;
      if (!color) return;
      state.accent_color = color;
      setAccentSelection(color);
      sendUpdate(event.currentTarget.closest('.settings-section'));
    });
  });

  if (bannerUrl) {
    bannerUrl.addEventListener('input', event => {
      state.banner_url = event.target.value.trim();
      sendUpdate(event.target.closest('.settings-section'));
    });
  }
}
