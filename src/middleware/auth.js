const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const AppError = require('../utils/AppError');
const { pool } = require('../config/db');

module.exports = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new AppError(401, 'Missing or malformed Authorization header');

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch {
      throw new AppError(401, 'Invalid or expired token');
    }

    const { rows } = await pool.query(
      'SELECT id, name, email, created_at AS "createdAt" FROM employees WHERE id = $1',
      [payload.sub]
    );
    const employee = rows[0];
    if (!employee) throw new AppError(401, 'Account no longer exists');

    req.user = employee;
    next();
  } catch (err) {
    next(err);
  }
};
