const express = require('express');
const path = require('path');

try {
  require('dotenv').config();
} catch (err) {
  console.warn('dotenv not available, relying on process.env');
}

const app = express();
const PORT = process.env.PORT || 3000;

function buildConfig() {
  return {
    CLIENT_ID: process.env.GEOLIVE_CLIENT_ID || process.env.CLIENT_ID || 'YOUR_CLIENT_ID',
    REDIRECT_URI: process.env.GEOLIVE_REDIRECT_URI || process.env.REDIRECT_URI || '',
    API_BASE_URL: process.env.GEOLIVE_API_BASE_URL || process.env.API_BASE_URL || 'https://YOUR-FLY-URL',
    SCOPE: process.env.GEOLIVE_SCOPE || process.env.SCOPE || 'identify guilds'
  };
}

app.get('/config.js', (_req, res) => {
  const config = buildConfig();
  res.type('application/javascript');
  res.set('Cache-Control', 'no-store');
  res.send(`window.GEOLIVE_CONFIG = ${JSON.stringify(config, null, 2)};`);
});

app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`GeoLive web service running on port ${PORT}`);
});
