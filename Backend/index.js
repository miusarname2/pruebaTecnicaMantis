import app from './src/app.js';
import config from './src/config/index.js';

const server = app.listen(config.port, () => {
  console.log(`✔ Site Viewer Lite API running on http://localhost:${config.port}`);
});

export default server;
