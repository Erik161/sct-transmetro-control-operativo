const { Pool } = require('pg');
const env = require('../config/env');

const pool = new Pool(env.db);

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};
