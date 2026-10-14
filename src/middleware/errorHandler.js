const AppError = require('../utils/AppError');

module.exports = {
  notFound: (_req, _res, next) => next(new AppError(404, 'Route not found')),

  errorHandler: (err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'Invalid identifier' });
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Resource already exists' });
    }
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({
      error: status === 500 ? 'Internal server error' : err.message,
      ...(err.details && { details: err.details }),
    });
  },
};
