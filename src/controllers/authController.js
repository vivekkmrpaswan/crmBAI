const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const signToken = (employee) =>
  jwt.sign({ sub: employee.id, email: employee.email }, jwtSecret, { expiresIn: jwtExpiresIn });

const publicEmployee = ({ id, name, email, createdAt }) => ({ id, name, email, createdAt });

const register = async (req, res) => {
  const { name, email, password } = req.valid.body;
  const passwordHash = await bcrypt.hash(password, 10);

  // The UNIQUE constraint on email is the source of truth (a 23505 error maps to 409),
  // so two simultaneous registrations can't both succeed.
  let rows;
  try {
    ({ rows } = await pool.query(
      `INSERT INTO employees (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at AS "createdAt"`,
      [name, email, passwordHash]
    ));
  } catch (err) {
    if (err.code === '23505') throw new AppError(409, 'Email already registered');
    throw err;
  }
  res.status(201).json({ employee: publicEmployee(rows[0]), token: signToken(rows[0]) });
};

const login = async (req, res) => {
  const { email, password } = req.valid.body;
  const { rows } = await pool.query(
    'SELECT id, name, email, password_hash, created_at AS "createdAt" FROM employees WHERE email = $1',
    [email]
  );
  const employee = rows[0];
  // Same message for unknown email / wrong password to avoid account enumeration.
  if (!employee || !(await bcrypt.compare(password, employee.password_hash))) {
    throw new AppError(401, 'Invalid email or password');
  }
  res.json({ employee: publicEmployee(employee), token: signToken(employee) });
};

const me = (req, res) => res.json({ employee: req.user });

module.exports = { registerSchema, loginSchema, register, login, me };
