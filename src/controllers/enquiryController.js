const { z } = require('zod');
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(7).max(20).optional(),
  courseInterest: z.string().trim().min(1).max(150),
  message: z.string().trim().max(1000).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const COLUMNS = `id, name, email, phone, course_interest AS "courseInterest", message,
  claimed_by AS "claimedBy", claimed_at AS "claimedAt", created_at AS "createdAt"`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const paginate = async (where, params, { page, limit }) => {
  const [list, count] = await Promise.all([
    pool.query(
      `SELECT ${COLUMNS} FROM enquiries WHERE ${where}
       ORDER BY created_at DESC, id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    ),
    pool.query(`SELECT count(*)::int AS total FROM enquiries WHERE ${where}`, params),
  ]);
  const { total } = count.rows[0];
  return { data: list.rows, page, limit, total, totalPages: Math.ceil(total / limit) };
};

// Public – no auth. Used by the enquiry form.
const createEnquiry = async (req, res) => {
  const { name, email, phone, courseInterest, message } = req.valid.body;
  const { rows } = await pool.query(
    `INSERT INTO enquiries (name, email, phone, course_interest, message)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [name, email, phone ?? null, courseInterest, message ?? null]
  );
  res.status(201).json({ message: 'Enquiry submitted', enquiry: { id: rows[0].id } });
};

// Public enquiries visible to every employee.
const getUnclaimed = async (req, res) => {
  res.json(await paginate('claimed_by IS NULL', [], req.valid.query));
};

// Private enquiries owned by the logged-in employee.
const getMine = async (req, res) => {
  res.json(await paginate('claimed_by = $1', [req.user.id], req.valid.query));
};

const claimEnquiry = async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) throw new AppError(400, 'Invalid enquiry id');

  // Single atomic statement: only succeeds if the enquiry is still unclaimed,
  // so two counselors clicking "Claim" at once can never both win.
  const { rows } = await pool.query(
    `UPDATE enquiries SET claimed_by = $2, claimed_at = now()
     WHERE id = $1 AND claimed_by IS NULL
     RETURNING ${COLUMNS}`,
    [id, req.user.id]
  );

  if (!rows[0]) {
    const exists = await pool.query('SELECT 1 FROM enquiries WHERE id = $1', [id]);
    if (!exists.rowCount) throw new AppError(404, 'Enquiry not found');
    throw new AppError(409, 'Enquiry has already been claimed');
  }
  res.json({ message: 'Enquiry claimed', enquiry: rows[0] });
};

module.exports = { createSchema, listQuerySchema, createEnquiry, getUnclaimed, getMine, claimEnquiry };
