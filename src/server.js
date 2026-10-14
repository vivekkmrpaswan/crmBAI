const { port } = require('./config/env');
const { initDB } = require('./config/db');
const app = require('./app');

initDB()
  .then(() => app.listen(port, () => console.log(`CRM API listening on :${port}`)))
  .catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
